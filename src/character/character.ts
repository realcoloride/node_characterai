import DMConversation from "../chat/dmConversation";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { PrivateProfile } from "../profile/privateProfile";
import { PublicProfile } from "../profile/publicProfile";
import { CAIImage as CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { CharacterVisibility } from "../utils/visbility";
import { CAIWebsocketConnectionType } from "../websocket";
import { v4 as uuidv4 } from 'uuid';

export enum CharacterVote {
    None,
    Like,
    Dislike
};

// makes it hidden from debug
const serializableFieldsSymbol = Symbol('serializableFields');

export function hiddenProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: false });
};

// for getters
export function getterProperty(target: any, propertyKey: string) {
    if (!target.constructor[serializableFieldsSymbol])
        target.constructor[serializableFieldsSymbol] = [];

    const fieldName = propertyKey;
    target.constructor[serializableFieldsSymbol].push({ propertyKey, show: true, fieldName });
};

export interface ICharacterDMCreation {
    withGreeting: boolean,
    specificChatId?: string,
    createNewConversation: boolean
};

export interface ICharacterGroupChatCreation {
    name: string,
    characters: Character[] | string[],
    anyoneCanJoin: boolean,
    requireApproval: boolean,
    withGreeting: boolean
};

export class Character {
    @hiddenProperty
    protected client: CharacterAI;

    // external_id
    @hiddenProperty
    private external_id = "";
    public get characterId() { return this.external_id; }
    public set characterId(value) { this.external_id = value; }

    // title
    public title: string = "";

    // description
    public description: string = "";

    // identifier
    public identifier: string = "";

    // visbility
    public visibility: CharacterVisibility = CharacterVisibility.Public;

    // copyable
    public copyable = false;

    // greeting
    public greeting = "";

    // avatar_file_name
    @hiddenProperty
    public avatar: CAIImage;

    // songs (no type found)
    public songs = [];

    // img_gen_enabled
    @hiddenProperty
    private img_gen_enabled = false;
    @getterProperty
    public get imageGenerationEnabled() { return this.img_gen_enabled; }
    public set imageGenerationEnabled(value) { this.img_gen_enabled = value; }

    // base_image_prompt
    @hiddenProperty
    private base_img_prompt = "";
    @getterProperty
    public get baseImagePrompt() { return this.base_img_prompt; }
    public set baseImagePrompt(value) { this.base_img_prompt = value; }

    // img_prompt_regex
    @hiddenProperty
    private img_prompt_regex = "";
    @getterProperty
    public get imagePromptRegex() { return this.img_prompt_regex; }
    public set imagePromptRegex(value) { this.img_prompt_regex = value; }

    // strip_img_prompt_from_msg
    @hiddenProperty
    private strip_img_prompt_from_msg = false;
    @getterProperty
    public get stripImagePromptFromMessage() { return this.strip_img_prompt_from_msg; }
    public set stripImagePromptFromMessage(value) { this.strip_img_prompt_from_msg = value; }
    
    // starter_prompts
    @hiddenProperty
    private starter_prompts = [];
    @getterProperty
    public get starterPrompts() { return this.starter_prompts; }
    public set starterPrompts(value) { this.starter_prompts = value; }
    
    // comments_enabled
    @hiddenProperty
    private comments_enabled = true;
    @getterProperty
    public get commentsEnabled() { return this.comments_enabled; }
    public set commentsEnabled(value) { this.comments_enabled = value; }
    
    // short_hash
    @hiddenProperty
    private short_hash = "";
    @getterProperty
    public get shortHash() { return this.short_hash; }
    public set shortHash(value) { this.short_hash = value; }
    
    // short_hash
    public usage = "default";

    //definition: string = "";

    // default_voice_id TODO SWITCH TO VOICE INSTANCE
    @hiddenProperty
    private default_voice_id = "";
    @getterProperty
    public get defaultVoiceId() { return this.default_voice_id; }
    public set defaultVoiceId(value) { this.default_voice_id = value; }

    // participant__name / aka display name
    // name
    @hiddenProperty
    private participant__name?: string = undefined;
    @hiddenProperty
    private name?: string = undefined;
    @hiddenProperty
    private participant__user__username?: string = undefined;
    @getterProperty
    public get displayName() { return this.participant__name ?? this.name ?? this.participant__user__username; }
    public set displayName(value) { 
        if (this.participant__name) this.participant__name = value;
        if (this.name) this.name = value;
        if (this.participant__user__username) this.participant__user__username == value;
    }

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
    public get interactionCount() { return this.participant__num_interactions ?? this.num_interactions; }
    public set interactionCount(value) { 
        if (this.participant__num_interactions) this.participant__num_interactions = value;
        if (this.num_interactions) this.num_interactions = value;
    }

    // user_id
    @hiddenProperty
    private user__id = 0;
    public get userId() { return this.user__id; }
    public set userId(value) { this.user__id = value; }

    // upvotes
    public upvotes = 0;

    /// features
    async DM(options: ICharacterDMCreation): Promise<DMConversation> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        // todo greeting
        let chatObject;
        if (options.specificChatId)
            chatObject = await this.client.fetchConversation(options.specificChatId, true);

        // create conversation
        if (options.createNewConversation) {
            const request = await this.client.sendDMWebsocketCommandAsync({
                command: "create_chat",
                originId: "Android",
                streaming: true,
                payload: {
                    chat: {
                        chat_id: uuidv4(),
                        creator_id: this.client.myProfile.userId.toString(),
                        visibility: "VISIBILITY_PRIVATE",
                        character_id: this.characterId,
                        type: "TYPE_ONE_ON_ONE"
                    },
                    with_greeting: options.withGreeting
                }
            })
            
            chatObject = request[0].chat;
        }

        return await this.client.connectToConversation(this.characterId, false, chatObject);
    }
    async createGroupChat(options: ICharacterGroupChatCreation) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        // todo
    }
    async getAuthorProfile(): Promise<PublicProfile | PrivateProfile> {
        // if the author is us, give private profile directly else fetch
        const username = this.user__username;
        const myProfile = this.client.myProfile;
        return username == myProfile.username ? myProfile : await this.client.fetchProfileByUsername(username);
    }
    async getVote() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

    }
    async setVote(vote: CharacterVote) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

    }

    async hide() { // /chat/character/hide
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

    }

    // todo remember to load avatar
    constructor(client: CharacterAI, information: any) {
        this.client = client;
        this.avatar = new CAIImage(client);
        ObjectPatcher.patch(this.client, this, information);
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

