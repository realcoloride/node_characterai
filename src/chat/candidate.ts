import { CharacterAI, CheckAndThrow } from "../client";
import Parser from "../parser";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import { CAIMessage } from "./message";

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
    @hiddenProperty
    protected message: CAIMessage;

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

    // safety_truncated
    @hiddenProperty
    private safety_truncated = false;
    @getterProperty
    public get wasFlagged() { return this.safety_truncated; }
    public set wasFlagged(value) { this.safety_truncated = value; }

    // annotation
    async createAnnotation(annotation: AnnotationStars | AnnotationValue | string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const isAnnotationString = typeof annotation == "string";
        const isAnnotationStars = Object.values(AnnotationStars).includes(annotation as AnnotationStars);

        const request = await this.client.requester.request("https://neo.character.ai/annotation/create", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                annotation: { 
                    annotation_type: isAnnotationString ? (isAnnotationStars ? "custom" : annotation as string) : "star", 
                    ...isAnnotationString ? { annotation_raw_content: annotation } : undefined,
                    annotation_value: isAnnotationString ? 1 : annotation as number
                },
                candidate_id: this.candidateId,
                turn_key: { chat_id: this.message.turnKey.chatId, turn_id: this.message.turnKey.turnId }
            }),
            contentType: 'application/json'
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        return response.annotation.annotation_id;
    }
    async removeAnnotation(annotationId: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://neo.character.ai/annotation/remove", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                annotation_id: annotationId,
                candidate_id: this.candidateId,
                turn_key: { chat_id: this.message.turnKey.chatId, turn_id: this.message.turnKey.turnId }
            }),
            contentType: 'application/json'
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
    }
    // https://neo.character.ai/multimodal/api/v1/memo/replay
    private async internalGetTTSUrl(voiceId?: string, voiceQuery?: string): Promise<string> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/memo/replay", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                candidateId: this.candidateId,
                roomId: this.message.chatId,
                turnId: this.message.turnId,
                voiceId,
                voiceQuery
            }),
            contentType: 'application/json'
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        return response.replayUrl;
    }
    async setPrimary() {
        if (this.message.primaryCandidate == this) return;
        await this.message.switchPrimaryCandidateTo(this.candidateId);
    }
    // TTS
    async getTTSUrlWithQuery(voiceQuery?: string) { return await this.internalGetTTSUrl(undefined, voiceQuery ?? ""); }
    async getTTSUrl(voiceId: string) { return await this.internalGetTTSUrl(voiceId); }

    constructor(client: CharacterAI, message: CAIMessage, information: any) {
        super();
        this.client = client;
        this.message = message;
        ObjectPatcher.patch(client, this, information);
    }
};

export class EditedCandidate extends Candidate {
    // base_candidate_id?
    @hiddenProperty
    private base_candidate_id = "";
    @getterProperty
    public get baseCandidateId() { return this.base_candidate_id; }
    public set baseCandidateId(value) { this.base_candidate_id = value; }

    // editor { author_id }?
    @hiddenProperty
    private editor: any = {};
    @hiddenProperty
    public get editorAuthorId() { return { authorId: this.editor.author_id }; }
};
