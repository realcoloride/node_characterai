import { hiddenProperty } from "../utils/specable";
import { CharacterAI } from "../client";

export class GroupChats {
    @hiddenProperty
    private client: CharacterAI;

    // fetching
    async fetchGroupChat() {

    }
    async fetchGroupChats() {

    }

    // management
    async createGroupChat() {

    }
    async joinGroupChatInvite() {

    }


    constructor(client: CharacterAI) {
        this.client = client;
    }
}