import CharacterAI from "../client";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty } from "../utils/specable";
import { Character } from "./character";

export class RecentCharacter extends Character {
    // chat_id
    @hiddenProperty
    private chat_id = "";
    @getterProperty
    public get lastConversationId() { return this.chat_id; }

    // create_time
    @hiddenProperty
    private create_time: string = "";
    @getterProperty
    public get lastConversationDate() { return new Date(this.create_time); }

    async getLastConversation() {
        return await this.client.fetchConversation(this.lastConversationId);
    }

    constructor(client: CharacterAI, information: any) {
        super(client, information);
        ObjectPatcher.patch(client, this, information);
    }
}