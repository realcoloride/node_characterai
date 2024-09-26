import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import CharacterAI, { CheckAndThrow } from "../client";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { CAIWebsocketConnectionType } from "../websocket";
import { v4 as uuidv4 } from 'uuid';
import { Candidate, EditedCandidate } from "./candidate";
import { Conversation } from "./conversation";

export class CAIMessage extends Specable {
    @hiddenProperty
    private client: CharacterAI;
    @hiddenProperty
    private conversation: Conversation;

    public image?: CAIImage; // todo

    // turn_key
    @hiddenProperty
    private turn_key: any = {};
    @getterProperty
    public get turnKey() { return {
        chatId: this.turn_key.chat_id,
        turnId: this.turn_key.turn_id,
    }; }

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
    public get name() { return this.author.name; }

    async getAuthorProfile() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const { authorId, isHuman } = this;
        if (!isHuman) throw Error("Failed to fetch author because this is message was not made by a human.");

        return await this.client.fetchProfileById(authorId);
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
    public getCandidates() {
        // create copy to avoid modification
        return {...this.candidateIdToCandidate};
    }
    // get primaryCandidate

    // primary_candidate_id
    @hiddenProperty
    private primary_candidate_id = "";

    public get primaryCandidate() {
        return this.getCandidateByTurnId(this.primary_candidate_id);
    }

    // use specific candidate id to change specific id or it will change the latest
    async edit(newContent: string, specificCandidateId?: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeConnected);
        const candidateId = specificCandidateId ?? this.primaryCandidate.candidateId;

        let request;
        switch (this.client.connectionType) {
            case CAIWebsocketConnectionType.DM:
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
                })
                break;
            case CAIWebsocketConnectionType.GroupChat:
                break;
        }

        // todo add candidate
        console.log("");
        
    }
    // next/previous/candidate_id
    async switchToCandidate(candidate: 'next' | 'previous' | string) {

    }
    async getMessageBefore() {

    }
    async getMessageAfter() {

    }
    async pin() {

    }
    async unpin() {
        
    }
    async copyFromHere() {

    }
    async rewindFromHere() {

    }
    async delete() {
        
    }

    constructor(client: CharacterAI, conversation: Conversation, turn: any) {
        super();
        this.client = client;
        this.conversation = conversation;
        ObjectPatcher.patch(this.client, this, turn);
        this.indexCandidates();
    }
}