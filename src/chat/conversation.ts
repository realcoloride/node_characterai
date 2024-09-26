import { getterProperty, hiddenProperty } from "../character/character";
import CharacterAI from "../client";
import { CharacterVisibility } from "../utils/visbility";

export interface ICAIConversationCreation {
    messages?: any[]
}

export enum ConversationState {
    Active = "STATE_ACTIVE",
    Archived = "STATE_ARCHIVED"
}

export enum ConversationVisibility {
    Public = "VISIBILITY_PUBLIC",
    Private = "VISIBILITY_PRIVATE"
}

export class Conversation {
    @hiddenProperty
    protected client: CharacterAI;

    // chat_id
    @hiddenProperty
    private chat_id = "";
    @getterProperty
    public get chatId() { return this.chat_id; }
    public set chatId(value) { this.chat_id = value; }

    // create_time
    @hiddenProperty
    private create_time: string = "";
    @getterProperty
    public get creationDate() { return new Date(this.create_time); }

    // creator_id
    @hiddenProperty
    private creator_id = "";
    @getterProperty
    public get creatorId() { return this.creator_id; }
    public set creatorId(value) { this.creator_id = value; }

    // character_id
    @hiddenProperty
    private character_id = "";

    // state
    public state: ConversationState = ConversationState.Active;

    // type
    public type: string = "TYPE_ONE_ON_ONE"; // todo figure out and make enum

    // visibility
    public visibility: ConversationVisibility = ConversationVisibility.Private;

    // features
    async getCharacter() {
        return await this.client.fetchCharacter(this.character_id);
    }
    // currently not available use creatorId instead
    async getCreator() {
        return await this.client.fetchProfileByUsername(this.creator_id)
    }

    async sendMessage() {

    }

    async archive() {

    }
    async duplicate() {

    }
    async rename() {
        
    }

    // disconnects from room
    async close() {

    }

    constructor(client: CharacterAI, information: any) {
        this.client = client;
        console.log("creating from ", information)
    }
};