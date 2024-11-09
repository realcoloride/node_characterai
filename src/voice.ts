import CharacterAI from "./client";
import ObjectPatcher from "./utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "./utils/specable";

export enum VoiceGender {
    Unknown = "",
    Neutral = "neutral"
}
export enum VoiceVisbility {
    Public = "public",
    Private = "private"
}
export enum InternalVoiceStatus {
    Unknown = "",
    Active = "active",
    Draft = "draft"
}

export class CAIVoice extends Specable {
    private client: CharacterAI;

    // id
    public id = "";

    // name
    public name = "";

    // description
    public description = "";

    // gender
    public gender: VoiceGender = VoiceGender.Unknown;

    // visibility
    public visibility: VoiceVisbility = VoiceVisbility.Public;

    @hiddenProperty
    private creatorInfo: any = {};
    //  "id": "147740177",
    //  "source": "user",
    //  "username": ""

    @hiddenProperty
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

    async edit() {
        // TODO
    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        ObjectPatcher.patch(client, this, information);
    }
}