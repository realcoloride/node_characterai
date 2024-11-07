import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import Warnings from "../warnings";
import { CAIMessage } from "./message";

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
    image?: CAIImage,
    getMyMessageInstead: boolean
};

export class Conversation extends Specable {
    @hiddenProperty
    protected client: CharacterAI;

    // max messages stored before it enters into a snake like thing to delete the oldest messages from memory. 
    // must be a multiple of 50.
    public maxMessagesStored = 200;
    public messages: CAIMessage[] = [];
    public messageIds: string[] = [];

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

    // (in cache)
    getLastMessage() {
        return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
    }
    
    protected frozen = false; // <- if refreshing, operations will be frozen
    private async getTurnsBatch(nextToken?: string, pinnedOnly?: boolean) {
        let query = "";
        if (nextToken) query = encodeURIComponent(`?next_token=${nextToken}`) // }
        if (pinnedOnly) query = "?pinned_only=true";
        
        const request = await this.client.requester.request(`https://neo.character.ai/turns/${this.chatId}/${query}`, {
            method: 'GET',
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);
        return response;
    }
    
    // responsible for checking if we reached the limit to avoid too much memory usage
    protected addMessage(message: CAIMessage) {
        // messages are always ranked from more recent to oldest
        if (this.messages.length >= this.maxMessagesStored) {
            // remove last & show warning
            this.messages.pop();
            this.messageIds.pop();
            Warnings.show("reachedMaxMessages");
        }

        // add to front
        this.messages.unshift(message);
        this.messageIds.unshift(message.turnId);
        return message;
    }
    protected async removeMessage() {
        // TODO
    }

    private async fetchMessagesViaQuery(pinnedOnly: boolean) {
        const { maxMessagesStored } = this;
        if (maxMessagesStored % 50 != 0) 
            throw Error("Max messages to store must be a multiple of 50.");
        
        let messages: CAIMessage[] = [];
        let nextToken: string | undefined = undefined;

        for (let i = 0; i < maxMessagesStored / 50; i += 50) {
            const response = await this.getTurnsBatch(nextToken, pinnedOnly);
            const { turns } = response;
            if (!turns) break;
            nextToken = response?.meta?.next_token;
            
            for (let j = 0; j < turns.length; j++) 
                messages.push(new CAIMessage(this.client, this, turns[j]));
        }

        return messages;
    }

    // keeps up to date with messages. this WILL wipe old messages
    async refreshMessages() {
        const { maxMessagesStored } = this;
        if (maxMessagesStored % 50 != 0) 
            throw Error("Max messages to store must be a multiple of 50.");
        
        this.frozen = true;
        this.messages = [];

        const messages = await this.fetchMessagesViaQuery(false);
        for (let i = 0; i < messages.length; i++)
            this.addMessage(messages[i]);

        const pinnedMessages = await this.getPinnedMessages();
        for (let i = 0; i < pinnedMessages.length; i++)
            this.messages[i].isPinned = true;
        
        this.frozen = false;
    }
    async sendMessage(content: string, options?: ICAIMessageSending): Promise<CAIMessage> {
        // DO NOT touch this. This is abstract/virtual behavior for higher level conversations (DM/Group)
        return new CAIMessage(this.client, this, {});
    }

    async getPinnedMessages() {
        return await this.fetchMessagesViaQuery(true);
    }

    async rename(newName: string) {
        
    }
    async deleteMessagesInBulk(messages: number | string[] | CAIMessage[], refreshMessages: boolean = true) {
        
    }
    async reset() {
        
    }

    // disconnects from room
    async close() {
        // todo
    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        ObjectPatcher.patch(this.client, this, information);
        console.log("creating from ", information)
    }
};