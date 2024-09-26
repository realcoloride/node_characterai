import { CheckAndThrow } from "../client";
import { Conversation, ICAIMessageSending } from "./conversation";
import { Message } from "./message";
import { v4 as uuidv4 } from 'uuid';

const generateBaseSendingPayload = (
    message: string,
    enableTTS: boolean,
    characterId: string,
    username: string, // our username
    turnKey: string,
    chatId: string,
    userId: number,
    imageUrl?: string
) => { return {
    num_candidates: 1,
    tts_enabled: enableTTS,
    selected_language: "",
    character_id: characterId,
    user_name: username,
    turn: {
        turn_key: { turn_id: turnKey, chat_id: chatId },
        author: { author_id: userId.toString(), is_human: true, name: username },
        candidates: [{
            candidate_id: turnKey,
            raw_content: message,
            ...imageUrl ? { tti_image_rel_path: imageUrl } : {}
        }],
        primary_candidate_id: turnKey
    },
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

export default class DMConversation extends Conversation {

    async sendMessage(message: string, options?: ICAIMessageSending): Promise<Message> {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);
        
        // manual turn is FALSE by default
        const request = await this.client.sendDMWebsocketCommandAsync({
            command: (options?.manualTurn ?? false) ? "create_chat" : "create_and_generate_turn",
            originId: "Android",
            streaming: true,
            payload: generateBaseSendingPayload(
                message,
                false, // todo TTS
                this.characterId,
                this.client.myProfile.username,
                uuidv4(),
                this.chatId,
                this.client.myProfile.userId,
                options?.image?.endpointUrl ?? ""
            )
        })

        console.log(request);
        return new Message(this.client, {}); // todo
    }
};