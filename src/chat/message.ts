import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import CharacterAI, { CheckAndThrow } from "../client";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";

export class Message extends Specable {
    @hiddenProperty
    private client: CharacterAI;

    public image?: CAIImage; // todo

    // turn_key
    @hiddenProperty
    private turn_key: any = {};
    @getterProperty
    public get turnKey() { return {
        chatId: this.turn_key.chat_id,
        turnId: this.turn_key.turn_id,
    }; }

    // create_time
    @hiddenProperty
    private create_time = "";
    @getterProperty
    public get creationDate() { return new Date(this.create_time); }

    // last_update_time
    @hiddenProperty
    private last_update_time = "";
    @getterProperty
    public get lastUpdateDate() { return new Date(this.last_update_time); }

    // state
    private state = "STATE_OK";

    // author
    @hiddenProperty
    private author: any = {};
    @getterProperty
    public get authorId() { return this.author.author_id; }
    @getterProperty
    public get isHuman() { return this.author.is_human ?? false; }
    @getterProperty
    public get name() { return this.author.name; }

    async getAuthorProfile() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const { authorId, isHuman } = this;
        if (!isHuman) throw Error("Failed to fetch author because this is message was not made by a human.");

        return await this.client.fetchProfileById(authorId);
    }
    async getCharacter() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const { authorId, isHuman } = this;
        if (isHuman) throw Error("Failed to fetch character because this is message was not made by a character.");

        return await this.client.fetchCharacter(authorId);
    }

    // candidates 
    // |_ candidate_id
    // |_ create_time
    // |_ raw_content?
    // |_ is_final?
    @hiddenProperty
    private candidates: any = [];

    @hiddenProperty
    public get candidate() { return this.candidates[0]; }
    @getterProperty
    public get candidateId() { return this.candidate.candidate_id; }
    @getterProperty
    public get content() { return this.candidate.raw_content; }
    @getterProperty
    public get isFinal() { return this.candidate.is_final; }

    // primary_candidate_id
    @hiddenProperty
    private primary_candidate_id = false;
    @getterProperty
    public get primaryCandidateId() { return this.primary_candidate_id; }
    public set primaryCandidateId(value) { this.primary_candidate_id = value; }

    async edit(newContent: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeConnected);

        const request = await this.client.sendDMWebsocketCommandAsync();
    }
    async pin() {

    }
    async copyFromHere() {

    }
    async delete() {

    }
    
    constructor(client: CharacterAI, turn: any) {
        super();
        this.client = client;
        ObjectPatcher.patch(this.client, this, turn);
    }
}