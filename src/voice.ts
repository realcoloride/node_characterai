import { CharacterAI, CheckAndThrow } from "./client";
import Parser from "./parser";
import ObjectPatcher from "./utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "./utils/specable";

export enum VoiceGender {
    Unknown = "",
    Neutral = "neutral"
}
export enum VoiceVisibility {
    Public = "public",
    Private = "private"
}
export enum InternalVoiceStatus {
    Unknown = "",
    Active = "active",
    Draft = "draft"
}

export class CAIVoice extends Specable {
    @hiddenProperty
    private client: CharacterAI;

    @hiddenProperty
    private rawInformation: any = {};

    // id
    public id = "";

    // name
    public name = "";

    // description
    public description = "";

    // gender
    public gender: VoiceGender = VoiceGender.Unknown;

    // visibility
    public visibility: VoiceVisibility = VoiceVisibility.Public;

    @hiddenProperty
    private creatorInfo: any = {};
    //  "id": "147740177",
    //  "source": "user",
    //  "username": ""

    @getterProperty
    private get creatorUsername() { return this.creatorInfo.user; }
    @getterProperty
    public get creatorSource() { return this.creatorInfo.source; }

    // audioSourceType
    public audioSourceType = "";

    // previewText
    public previewText = "";

    // previewAudioURI
    public previewAudioURI = "";

    // backendProvider
    public backendProvider = "";

    // backendId
    public backendId = "";

    // internalStatus
    public internalStatus: InternalVoiceStatus = InternalVoiceStatus.Unknown;

    // lastUpdateTime
    public lastUpdateTime = "";
    
    // methods
    async getCreator() {
        return await this.client.fetchProfileByUsername(this.creatorUsername);
    }

    async edit(name: string, description: string, makeVoicePublic: boolean, previewText: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const payload = this.rawInformation;
        payload.name = name;
        payload.description = description;
        payload.visibility = makeVoicePublic ? VoiceVisibility.Public : VoiceVisibility.Private;
        payload.previewText = previewText;

        // publish character now/edit
        const request = await this.client.requester.request(`https://neo.character.ai/multimodal/api/v1/voices/${this.id}`, {
            method: 'PUT',
            body: Parser.stringify({ voice: payload }),
            contentType: 'application/json',
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response.message ?? String(response));

        const information = response.voice;
        this.rawInformation = information;
        ObjectPatcher.patch(this.client, this, information);
    }
    async delete() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        if (this.client.myProfile.username != this.creatorUsername) return new Error("You do not have the permission to do this");
        
        const request = await this.client.requester.request(`https://neo.character.ai/multimodal/api/v1/voices/${this.id}`, {
            method: 'DELETE',
            includeAuthorization: true
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response.message ?? String(response));
    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        this.rawInformation = information;
        ObjectPatcher.patch(client, this, information);
    }
}