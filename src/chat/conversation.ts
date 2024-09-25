import { getterProperty, hiddenProperty } from "../character/character";
import CharacterAI from "../client";

export interface ICAIConversationCreation {
    messages?: any[]
}

export class Conversation {
    @hiddenProperty
    protected client: CharacterAI;

    // is_human
    @hiddenProperty
    private chat_id = "";
    @getterProperty
    public get chatId() { return this.chat_id; }
    public set chatId(value) { this.chat_id = value; }



    async close() {

    }

    constructor(client: CharacterAI, information: any) {
        this.client = client;
        //console.log("creating from ", information)
    }
};