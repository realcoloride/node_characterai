import { CAICall, ICharacterCallOptions } from "../character/call";
import { CheckAndThrow } from "../client";
import Parser from "../parser";
import Warnings from "../warnings";
import { Conversation, ICAIMessageSending } from "./conversation";
import { CAIMessage } from "./message";
import { v4 as uuidv4 } from 'uuid';

const generateBaseMessagePayload = (
    characterId: string,
    username: string, // our username
) => { return {
    character_id: characterId,
    selected_language: "",
    tts_enabled: false,
    user_name: username,
    previous_annotations: {
        boring: 0,
        not_boring: 0,
        inaccurate: 0,
        not_inaccurate: 0,
        repetitive: 0,
        not_repetitive: 0,
        out_of_character: 0,
        not_out_of_character: 0,
        bad_memory: 0,
        not_bad_memory: 0,
        long: 0,
        not_long: 0,
        short: 0,
        not_short: 0,
        ends_chat_early: 0,
        not_ends_chat_early: 0,
        funny: 0,
        not_funny: 0,
        interesting: 0,
        not_interesting: 0,
        helpful: 0,
        not_helpful: 0
    }
}};

const generateBaseSendingPayload = (
    message: string,
    characterId: string,
    username: string, // our username
    turnId: string,
    chatId: string,
    userId: number,
    imageUrl?: string
) => { return {...generateBaseMessagePayload(characterId, username),
    num_candidates: 1,
    turn: {
        turn_key: { turn_id: turnId, chat_id: chatId },
        author: { author_id: userId.toString(), is_human: true, name: username },
        candidates: [{
            candidate_id: turnId,
            raw_content: message,
            ...imageUrl ? { tti_image_rel_path: imageUrl } : {}
        }],
        primary_candidate_id: turnId
    }
}};

const generateBaseRegeneratingPayload = (
    characterId: string,
    turnId: string,
    username: string, // our username
    chatId: string
) => { return {...generateBaseMessagePayload(characterId, username),
    turn_key: { turn_id: turnId, chat_id: chatId },
}};

export default class DMConversation extends Conversation {
    async resurrect() {
        const resurectionRequest = await this.client.requester.request(`https://neo.character.ai/chats/recent/${this.chatId}`, {
            method: 'GET',
            includeAuthorization: true
        });
        const resurectionResponse = await Parser.parseJSON(resurectionRequest);
        if (!resurectionRequest.ok) throw new Error(resurectionResponse);
    }

    async archive() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.requester.request(`https://neo.character.ai/chat/${this.chatId}/archive`, {
            method: 'PATCH',
            includeAuthorization: true,
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);
    }
    async unarchive(refreshMessagesAfter: boolean = true): Promise<DMConversation | void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.requester.request(`https://neo.character.ai/chat/${this.chatId}/unarchive`, {
            method: 'PATCH',
            includeAuthorization: true,
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);
        if (!refreshMessagesAfter) return;

        await this.resurrect();
        await this.refreshMessages();
    }

    async duplicate() {
        await this.refreshMessages();
        const lastMessage = this.getLastMessage();

        if (!lastMessage) throw new Error("You must have atleast one message in the conversation to do this");
        return await lastMessage.copyFromHere(true) as DMConversation;
    }

    async rename(newName: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.requester.request(`https://neo.character.ai/chat/${this.chatId}/update_name`, {
            method: 'PATCH',
            includeAuthorization: true,
            body: Parser.stringify({ name: newName }),
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);
    }

    async call(options: ICharacterCallOptions): Promise<CAICall> {
        // oh boy im hyped for this
        const call = new CAICall(this.client, this);
        return await this.client.connectToCall(call, options);
    }

    async sendMessage(content: string, options?: ICAIMessageSending): Promise<CAIMessage> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        if (this.frozen)
            Warnings.show("sendingFrozen");
        
        // manual turn is FALSE by default
        const request = await this.client.sendDMWebsocketCommandAsync({
            command: (options?.manualTurn ?? false) ? "create_chat" : "create_and_generate_turn",
            originId: "Android",
            
            streaming: false,
            payload: generateBaseSendingPayload(
                content,
                this.characterId,
                this.client.myProfile.username,
                uuidv4(),
                this.chatId,
                this.client.myProfile.userId,
                options?.image?.endpointUrl ?? ""
            )
        });
        
        // here we should receive OUR message not theirs if selected. im not sure how to do this but i will see
        return this.addMessage(new CAIMessage(this.client, this, request.turn));
    }

    async regenerateMessage(message: CAIMessage) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.sendDMWebsocketCommandAsync({
            command: "generate_turn_candidate",
            originId: "Android",
            
            streaming: false,
            payload: generateBaseRegeneratingPayload(
                this.characterId,
                message.turnId,
                this.client.myProfile.username,
                this.chatId
            )
        });
        
        message.indexTurn(request.turn);
        return message;
    }
};