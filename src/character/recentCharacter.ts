import { CharacterAI, CheckAndThrow } from "../client";
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

    // https://neo.character.ai/chats/recent/characterId/hide (PUT)
    async removeFromRecents() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request(`https://neo.character.ai/chats/recent/${this.characterId}/hide`, {
            method: 'PUT',
            includeAuthorization: true
        });
        if (!request.ok) throw new Error(String(request));
    }
    async getLastDMConversation() { return await this.client.fetchDMConversation(this.lastConversationId); }

    constructor(client: CharacterAI, information: any) {
        super(client, information);
        ObjectPatcher.patch(client, this, information);
    }
}