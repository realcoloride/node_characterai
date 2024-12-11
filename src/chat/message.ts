import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import { CharacterAI, CheckAndThrow } from "../client";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { Candidate, EditedCandidate } from "./candidate";
import { Conversation } from "./conversation";
import Parser from "../parser";
import DMConversation from "./dmConversation";
import { GroupChatConversation } from "../groupchat/groupChatConversation";
import Warnings from "../warnings";

export class CAIMessage extends Specable {
    @hiddenProperty
    private client: CharacterAI;
    @hiddenProperty
    private conversation: Conversation;

    @hiddenProperty
    private image?: CAIImage;

    // turn_key
    @hiddenProperty
    private turn_key: any = {};
    @getterProperty
    public get turnKey() { return {
        chatId: this.turn_key.chat_id,
        turnId: this.turn_key.turn_id,
    }; }

    @getterProperty
    public get turnId(): string { return this.turnKey.turnId; }
    @getterProperty
    public get chatId() { return this.turnKey.chatId; }

    // create_time
    @hiddenProperty
    private create_time = "";
    @getterProperty
    public get creationDate() { return new Date(this.create_time); }

    // last_update_time
    @hiddenProperty
    private last_update_time = "";
    @getterProperty
    public get lastUpdateDate() { return new Date(this.last_update_time); }

    // state
    public state = "STATE_OK";

    // author
    @hiddenProperty
    private author: any = {};
    @getterProperty
    public get authorId() { return this.author.author_id; }
    @getterProperty
    public get isHuman() { return this.author.is_human ?? false; }
    @getterProperty
    public get authorUsername() { return this.author.name; }

    // is_pinned
    @hiddenProperty
    private is_pinned: boolean = false;

    @getterProperty
    public get isPinned() { return this.is_pinned; }
    public set isPinned(value) { this.is_pinned = value; }

    async getAuthorProfile() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const { authorUsername, isHuman } = this;
        if (!isHuman) throw Error("Failed to fetch author because this is message was not made by a human.");

        return await this.client.fetchProfileByUsername(authorUsername);
    }
    async getCharacter() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const { authorId, isHuman } = this;
        if (isHuman) throw Error("Failed to fetch character because this is message was not made by a character.");

        return await this.client.fetchCharacter(authorId);
    }

    // candidates 
    // |_ candidate_id
    // |_ create_time
    // |_ raw_content?
    // |_ is_final?
    @hiddenProperty
    private candidates: any[] = [];
    // the main request forces you to use candidates

    @hiddenProperty
    private candidateIdToCandidate: Record<string, Candidate> = {};

    // the way candidates work is basically the messages that get edited you have
    // a way to select between 1/30 candidates and [0] will always be the latest candidate
    // turn key is the identifier that holds them (aka a "message.id")
    // combo is chat id + turn key but we already have the chat id
    // turn keys are indexed by the conversation

    // this function will index candidates and give them proper instances
    private addCandidate(candidateObject: any, addAfterToActualRawCandidates: boolean) {
        const isEditedCandidate = this.candidates.length > 1;
            
        const candidate = isEditedCandidate
            ? new EditedCandidate(this.client, this, candidateObject)
            : new Candidate(this.client, this, candidateObject);

        if (candidate.wasFlagged)
            Warnings.show('contentFiltered');

        this.candidateIdToCandidate[candidate.candidateId] = candidate;
        if (addAfterToActualRawCandidates) this.candidates.unshift(candidateObject);
    }
    private indexCandidates() {
        this.candidateIdToCandidate = {};

        for (let i = 0; i < this.candidates.length; i++) {
            const candidateObject = this.candidates[i];
            this.addCandidate(candidateObject, false); // we use previously added, no need to readd
        }
    }
    private getCandidateByTurnId(turnId: string) {
        const candidate = this.candidateIdToCandidate[turnId];
        if (!candidate) throw new Error("Candidate not found");
        return candidate;
    }
    private getCandidateByIndex(index: number) {
        const candidate = Object.values(this.candidateIdToCandidate)[index];
        if (!candidate) throw new Error("Candidate not found");
        return candidate;
    }
    public getCandidates(): Record<string, Candidate> {
        // create copy to avoid modification
        return {...this.candidateIdToCandidate};
    }
    // get primaryCandidate

    // content is influenced by the primary candidate to save time/braincells
    public get content() { return this.primaryCandidate?.content ?? ""; }
    public get wasFlagged() { return this.primaryCandidate?.wasFlagged ?? false; }

    // primary_candidate_id
    @hiddenProperty
    private primary_candidate_id = "";

    public get primaryCandidate() { return this.getCandidateByTurnId(this.primary_candidate_id); }

    // use specific candidate id to change specific id or it will change the latest
    async edit(newContent: string, specificCandidateId?: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        const candidateId = specificCandidateId ?? this.primaryCandidate.candidateId;

        let request;
        if (this.conversation instanceof DMConversation) {
            request = await this.client.sendDMWebsocketCommandAsync({
                command: "edit_turn_candidate",
                originId: "Android",
                streaming: true,
                waitForAIResponse: false,
                
                payload: {
                    turn_key: this.turn_key,
                    current_candidate_id: candidateId,
                    new_candidate_raw_content: newContent
                }
            });
        } else {

        }

        this.candidates = request.pop().turn.candidates;
        this.indexCandidates();
    }
    // next/previous/candidate_id
    private async internalSwitchPrimaryCandidate(candidate: 'next' | 'previous' | string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        let candidateId = candidate;
        let candidates = this.getCandidates();
        const candidateValues = Object.values(candidates);
        const primaryCandidateIndex = Object.keys(candidates).indexOf(this.primary_candidate_id);

        if (primaryCandidateIndex != -1) {
            if (candidate == 'next') candidateId = candidateValues[primaryCandidateIndex + 1]?.candidateId ?? "";
            if (candidate == 'previous') candidateId = candidateValues[primaryCandidateIndex - 1]?.candidateId ?? "";
        }
        
        if (candidateId.trim() == "") throw new Error("Cannot find the message, it is invalid or it is out of range.")

        const firstRequest = await this.client.requester.request(`https://neo.character.ai/annotations/${this.conversation.chatId}/${this.turnId}/${candidateId}`, {
            method: 'POST',
            contentType: 'application/json',
            body: '{}',
            includeAuthorization: true
        });
        const firstResponse = await Parser.parseJSON(firstRequest);
        if (!firstRequest.ok) throw new Error(firstResponse);

        await this.client.sendDMWebsocketCommandAsync({
            command: "update_primary_candidate",
            originId: "Android",
            streaming: false,
            waitForAIResponse: true,
            expectedReturnCommand: "ok",
            
            payload: {
                candidate_id: candidateId,
                turn_key: this.turn_key,
            }
        });

        this.primary_candidate_id = candidate;
        this.indexCandidates();
        return this.primaryCandidate;
    }
    async switchToPreviousCandidate() { return this.internalSwitchPrimaryCandidate("previous"); }
    async switchToNextCandidate() { return this.internalSwitchPrimaryCandidate("next"); }
    async switchPrimaryCandidateTo(candidateId: string) { return await this.internalSwitchPrimaryCandidate(candidateId); }

    async regenerate() { return this.conversation.regenerateMessage(this); }

    private getConversationMessageAfterIndex(offset: number): CAIMessage | null {
        const conversationMessageIds = this.conversation.messageIds;
        let index = conversationMessageIds.indexOf(this.turnId);
        if (index == -1) return null;

        index += offset;
        if (index < 0 || index >= conversationMessageIds.length) return null;

        return this.conversation.messages[index];
    }
    
    public getMessageBefore() { return this.getConversationMessageAfterIndex(-1); }
    public getMessageAfter() { return this.getConversationMessageAfterIndex(1); }
    private async getAllMessagesAfter() {
        const conversationMessageIds = this.conversation.messageIds;
        const index = conversationMessageIds.indexOf(this.turnId);
        if (index == -1) return [];

        let messagesAfter: CAIMessage[] = [];

        // FIXME: might wanna not use the cache for that one
        for (let i = index; i < conversationMessageIds.length; i++) 
            messagesAfter.push(this.conversation.messages[i]);
        
        return messagesAfter;
    }

    private async handlePin(isPinned: boolean) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        if (this.isPinned == isPinned) return;

        await this.client.sendDMWebsocketCommandAsync({
            command: "set_turn_pin",
            originId: "Android",
            streaming: false,
            waitForAIResponse: false,

            payload: {
                turn_key: this.turn_key,
                is_pinned: isPinned
            }
        });
        
        this.isPinned = isPinned;
    }
    async pin() { await this.handlePin(true); }
    async unpin() { await this.handlePin(false); }
    // https://neo.character.ai/chat/id/copy
    async copyFromHere(isDM: boolean = true): Promise<DMConversation | GroupChatConversation> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request(`https://neo.character.ai/chat/${this.conversation.chatId}/copy`, {
            method: 'POST',
            contentType: 'application/json',
            body: Parser.stringify({ end_turn_id: this.turnId }),
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
        
        const { new_chat_id: newChatId } = response;
        return isDM 
            ? await this.client.fetchDMConversation(newChatId)
            : await this.client.fetchGroupChatConversation();
    }
    async rewindFromHere() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        if (this.conversation.getLastMessage()?.turnId == this.turnId) 
            throw new Error("You cannot rewind from the last message in the conversation.");

        return await this.conversation.deleteMessagesInBulk(await this.getAllMessagesAfter());
    }
    async delete() { return await this.conversation.deleteMessage(this); }

    // TTS
    async getTTSUrlWithQuery(voiceQuery?: string) { return await this.primaryCandidate.getTTSUrlWithQuery(voiceQuery); }
    async getTTSUrl(voiceId: string) { return await this.primaryCandidate.getTTSUrl(voiceId); }

    /**
     * Patches and indexes an unsanitized turn.
     * @remarks **Do not use this method.** It is meant for internal use only.
     */
    public indexTurn(turn: any) {
        ObjectPatcher.patch(this.client, this, turn);
        this.indexCandidates();
    }

    constructor(client: CharacterAI, conversation: Conversation, turn: any) {
        super();
        this.client = client;
        this.conversation = conversation;
        this.indexTurn(turn);
    }
}