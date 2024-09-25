import CharacterAI from "../client";

export interface ICAIConversationCreation {
    messages?: any[]
}

export class Conversation {
    protected client: CharacterAI;

    async close() {

    }

    constructor(client: CharacterAI, information: any) {
        this.client = client;
        console.log("creating from ", information)
    }
};