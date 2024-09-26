import { getterProperty, hiddenProperty } from "../character/character";
import CharacterAI, { CheckAndThrow } from "../client";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { Message } from "./message";

export interface ICAIConversationCreation {
    messages?: any[]
};

export enum ConversationState {
    Active = "STATE_ACTIVE",
    Archived = "STATE_ARCHIVED"
};

export enum ConversationVisibility {
    Public = "VISIBILITY_PUBLIC",
    Private = "VISIBILITY_PRIVATE"
};

export interface ICAIMessageSending {
    manualTurn: boolean,
    image?: CAIImage
};

export class Conversation {
    @hiddenProperty
    protected client: CharacterAI;

    public maxMessagesStored = 200; // max messages stored before it enters into a snake like thing to delete the oldest messages from memory
    public messages: Message[] = [];

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
    @getterProperty
    protected get characterId() { return this.character_id; }
    protected set characterId(value) { this.character_id = value; }

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

    // keeps up to date with messages
    async fetchMessages() {

    }
    async sendMessage(message: string, options?: ICAIMessageSending): Promise<Message> {
        return new Message();
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
        ObjectPatcher.patch(this.client, this, information);
        console.log("creating from ", information)
    }
};