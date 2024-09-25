import CAIClient from "../client";
import PrivateProfile from "../profile/privateProfile";
import { PublicProfile } from "../profile/publicProfile";
import { CAIImage as CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { CharacterVisibility } from "../utils/visbility";

export enum CharacterVote {
    None,
    Like,
    Dislike
}

// makes it hidden from debug
const serializableFieldsSymbol = Symbol('serializableFields');

export function hiddenProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: false });
}

// for getters
export function getterProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    const fieldName = propertyKey;
    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: true, fieldName });
}

export class Character {
    protected client: CAIClient;

    // external_id
    @hiddenProperty
    private external_id = "";
    public get externalId() { return this.external_id; }
    public set externalId(value) { this.external_id = value; }

    // title
    public title: string = "";

    // description
    public description: string = "";

    // visbility
    public visibility: CharacterVisibility = CharacterVisibility.Public;

    // copyable
    public copyable = false;

    // greeting
    public greeting = "";

    // avatar_file_name
    public avatar: CAIImage;

    // img_gen_enabled
    @hiddenProperty
    private img_gen_enabled = "";
    @getterProperty
    public get imageGenerationEnabled() { return this.img_gen_enabled; }
    public set imageGenerationEnabled(value) { this.img_gen_enabled = value; }

    //definition: string = "";

    // default_voice_id
    @hiddenProperty
    private default_voice_id = "";
    @getterProperty
    public get defaultVoiceId() { return this.default_voice_id; }
    public set defaultVoiceId(value) { this.default_voice_id = value; }

    // participant__name / aka display name
    @hiddenProperty
    private participant__name = "";
    @getterProperty
    public get displayName() { return this.participant__name; }
    public set displayName(value) { this.participant__name = value; }

    // user__username / aka author
    @hiddenProperty
    protected user__username = "";

    // participant__num_interactions
    // num_interactions
    @hiddenProperty
    private participant__num_interactions?: string = undefined;
    @hiddenProperty
    private num_interactions?: string = undefined;
    @getterProperty
    public get interactionCount() { return this.participant__num_interactions || this.num_interactions; }
    public set interactionCount(value) { 
        if (this.participant__num_interactions) this.participant__num_interactions = value;
        if (this.num_interactions) this.num_interactions = value;
    }

    // user_id
    @hiddenProperty
    private user__id = 0;
    public get userId() { return this.user__id; }
    public set userId(value) { this.user__id = value; }

    //stripImagePromptFromMessage: boolean = false;
    //upvotes?


    /// features
    async getAuthorProfile(): Promise<PublicProfile | PrivateProfile> {
        // if the author is us, give private profile directly else fetch
        const username = this.user__username;
        const myProfile = this.client.myProfile;
        return username == myProfile.username ? myProfile : await this.client.lookupProfile(username);
    }
    async getVote() {

    }
    async setVote(vote: CharacterVote) {

    }

    // todo remember to load avatar
    constructor(client: CAIClient, information: any) {
        this.client = client;
        this.avatar = new CAIImage(client);
    }
    async loadFromInformation(information: any) {
        await ObjectPatcher.patch(this.client, this, information);
    }
    [Symbol.for('nodejs.util.inspect.custom')]() {
        const serializedData: any = {};
        
        const decoratedFields = (this as any).constructor[serializableFieldsSymbol] || [];
        const allFields = Object.keys(this);
    
        for (const field of decoratedFields) {
            if (!field.show) continue; 
    
            const fieldName = field.fieldName || field.propertyKey;
            serializedData[fieldName] = (this as any)[field.propertyKey];
        }
    
        for (const field of allFields) {
            if (!decoratedFields.some((decorated: any) => decorated.propertyKey === field))
                serializedData[field] = (this as any)[field];
        }
    
        return serializedData;
    }
}

