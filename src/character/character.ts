import IDMCollection from "../chat/dmCollection";
import DMConversation from "../chat/dmConversation";
import { PreviewDMConversation } from "../chat/previewDMConversation";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { PrivateProfile } from "../profile/privateProfile";
import { PublicProfile } from "../profile/publicProfile";
import { CAIImage as CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import { v4 as uuidv4 } from 'uuid';
import { ReportCharacterReason } from "./reportCharacter";

export enum CharacterVote {
    None,
    Like,
    Dislike
};

export enum CharacterVisibility {
    Private = "PRIVATE",
    Public = "PUBLIC",
}

export interface ICharacterGroupChatCreation {
    name: string,
    characters: Character[] | string[],
    anyoneCanJoin: boolean,
    requireApproval: boolean,
    withGreeting: boolean
};

export class Character extends Specable {
    @hiddenProperty
    protected client: CharacterAI;

    // external_id / character_id
    @hiddenProperty
    private external_id = "";
    @hiddenProperty
    private set character_id(value: any) { this.external_id = value; }

    public get characterId() { return this.external_id; }
    public set characterId(value) { this.external_id = value; }

    // title
    public title: string = "";

    // description
    public description: string = "";

    // identifier
    public identifier: string = "";

    // character_visibility / visibility
    public visibility: CharacterVisibility = CharacterVisibility.Public;

    @hiddenProperty
    private set character_visibility(value: CharacterVisibility) { this.visibility = value; }

    // copyable
    public copyable = false;

    // greeting
    public greeting = "";

    // avatar_file_name
    @hiddenProperty
    public avatar: CAIImage;

    // songs (no type found)
    public songs: any[] = [];

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

    // definition
    public definition = "";

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
    @hiddenProperty
    private character_name?: string = undefined;
    @getterProperty
    public get displayName() { return this.participant__name ?? this.name ?? this.participant__user__username ?? this.character_name; }
    public set displayName(value) { 
        if (this.participant__name) this.participant__name = value;
        if (this.name) this.name = value;
        if (this.participant__user__username) this.participant__user__username = value;
        if (this.character_name) this.character_name = value;
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

    // user_id / creator_id
    @hiddenProperty
    private user__id = 0;
    @hiddenProperty
    private set creator_id(value: any) { this.user__id = value; }

    public get userId() { return this.user__id; }
    public set userId(value) { this.user__id = value; }

    // is_licensed_professional
    @hiddenProperty
    private is_licensed_professional = false;

    // upvotes
    public upvotes = 0;

    // translations / character_translations
    public translations: any = null;
    @hiddenProperty
    private set character_translations(value: any) { this.translations = value; }

    /// features
    async getDMs(turnPreviewCount: number = 2, refreshChats: boolean = false): Promise<PreviewDMConversation[]> {
        // refresh chats refreshes for get dms, might make longer
        const request = await this.client.requester.request(`https://neo.character.ai/chats/?character_ids=${this.characterId}?num_preview_turns=${turnPreviewCount}`, {
            method: 'GET',
            includeAuthorization: true,
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        const { chats } = response;
        const dms: PreviewDMConversation[] = [];

        for (let i = 0; i < chats.length; i++) {
            const conversation = new PreviewDMConversation(this.client, chats[i]);
            dms.push(conversation);

            if (!refreshChats) continue;
            await conversation.refreshMessages();
        }
        
        return dms;
    }
    // create new converstaion to false will fetch the latest conversation
    private async internalDM(createNewConversation: boolean, withGreeting?: boolean, specificChatId?: string): Promise<DMConversation> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        // todo greeting
        let chatObject;
        if (specificChatId)
            chatObject = await this.client.fetchRawConversation(specificChatId);

        // create conversation
        if (createNewConversation) {
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
                    with_greeting: withGreeting ?? true
                }
            })

            chatObject = request[0].chat;
        }

        return await this.client.connectToConversation(this.characterId, false, chatObject) as DMConversation;
    }
    async newDM(withGreeting?: boolean) { return await this.internalDM(true, withGreeting); }
    async DM(specificChatId?: string) { return await this.internalDM(false, false, specificChatId); }

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

    async report(reason: ReportCharacterReason, additionalDetails = ""): Promise<string> {
        const request = await this.client.requester.request(`https://neo.character.ai/report/create`, {
            method: 'POST',
            body: Parser.stringify({
                category: reason as string,
                comments: additionalDetails,
                reported_resource_id: this.characterId,
                type: "CHARACTER"
            }),
            includeAuthorization: true,
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        return response.report.report_id;
    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        this.avatar = new CAIImage(client);
        ObjectPatcher.patch(this.client, this, information);
    }
}