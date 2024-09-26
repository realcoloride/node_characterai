import CharacterAI, { CheckAndThrow } from "../client";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "../utils/specable";

export enum AnnotationStars {
    Remove = 0,
    One,
    Two,
    Three,
    Four
};

export enum AnnotationValue {
    Boring = "boring",
    Repetitive = "repetitive",
    BadMemory = "bad_memory",
    TooShort = "short",
    NotTrue = "inaccurate",
    OutOfCharacter = "out_of_character",
    TooLong = "long",
    EndedChatEarly = "ends_chat_early",

    Funny = "funny",
    Helpful = "helpful",
    Interesting = "interesting",
    GoodMemory = "good_memory",
}

export class Candidate extends Specable {
    @hiddenProperty
    protected client: CharacterAI;

    // candidate_id
    @hiddenProperty
    private candidate_id = "";
    @getterProperty
    public get candidateId() { return this.candidate_id; }
    public set candidateId(value) { this.candidate_id = value; }

    // create_time
    @hiddenProperty
    private create_time: string = "";
    @getterProperty
    public get creationDate() { return new Date(this.create_time); }

    // raw_content
    @hiddenProperty
    private raw_content = "";
    @getterProperty
    public get content() { return this.raw_content; }
    public set content(value) { this.raw_content = value; }

    // is_final
    @hiddenProperty
    private is_final = true;
    @getterProperty
    public get isFinal() { return this.is_final; }
    public set isFinal(value) { this.is_final = value; }

    // annotation
    async getAnnotation() {

    }
    async setNote(stars: AnnotationStars) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

    }
    async setFeedback(feedback: AnnotationValue, addOrRemove: boolean) {

    }
    async setFeedbackDetails(additionalDetails: string) {

    }
    
    async setPrimary() {
        // todo
    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        ObjectPatcher.patch(client, this, information);
    }
};

export class EditedCandidate extends Candidate {
    // base_candidate_id?

    // editor { author_id }?

};
