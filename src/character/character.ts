import DMConversation from "../chat/dmConversation";
import { PreviewDMConversation } from "../chat/previewDMConversation";
import { CharacterAI, CheckAndThrow } from "../client";
import Parser from "../parser";
import { PrivateProfile } from "../profile/privateProfile";
import { PublicProfile } from "../profile/publicProfile";
import { CAIImage as CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "../utils/specable";
import { v4 as uuidv4 } from 'uuid';
import { ReportCharacterReason } from "./reportCharacter";
import { CAIVoice } from "../voice";
import { CharacterVisibility, CharacterVote, ICharacterModificationOptions } from "./characterEnums";
import { CSRF_COOKIE_REQUIRED, GROUP_CHATS_NOT_SUPPORTED_YET, WEIRD_INTERNAL_SERVER_ERROR } from "../utils/unavailableCodes";
import { Persona } from "../profile/persona";

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

    @getterProperty
    public get externalId() { return this.external_id; }
    public set externalId(value) { this.external_id = value; }

    @getterProperty
    public get characterId() { return this.external_id; }
    public set characterId(value) { this.external_id = value; }

    // title aka tagline
    private title: string = "";
    
    @getterProperty
    public get tagline() { return this.title; }
    public set tagline(value) { this.title = value; }

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

    // dynamic_greeting_enabled
    @hiddenProperty
    private dynamic_greeting_enabled?: boolean = undefined;
    @hiddenProperty
    private allow_dynamic_greeting?: boolean = undefined;
    @getterProperty
    public get dynamicGreetingEnabled() { return this.dynamic_greeting_enabled ?? this.allow_dynamic_greeting; }
    public set dynamicGreetingEnabled(value) { 
        if (this.dynamic_greeting_enabled) this.dynamic_greeting_enabled = value;
        if (this.allow_dynamic_greeting) this.allow_dynamic_greeting = value;
    }

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

    // default_voice_id 
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

    // num_likes
    @hiddenProperty
    private num_likes: number = 0;
    @getterProperty
    public get likeCount() { return this.num_likes; }

    // num_interactions_last_day
    @hiddenProperty
    private num_interactions_last_day: number = 0;
    @getterProperty
    public get interactionCountLastDay() { return this.num_interactions_last_day; }

    // has_definition
    @hiddenProperty
    private has_definition: boolean = false;
    @getterProperty
    public get hasDefinition() { return this.has_definition; }

    // safety
    public safety: string = 'SAFE';

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

    async getDefaultVoice() {
        return await this.client.fetchVoice(this.default_voice_id);
    }

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

        var conversation;
        if (specificChatId)
            conversation = await this.client.fetchDMConversation(specificChatId);

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

            conversation = new DMConversation(this.client, request[0].chat);
        }

        // if no chat id after allat, lets fetch the most recent one
        if (!specificChatId) 
            conversation = await this.client.fetchLatestDMConversationWith(this.characterId);

        await conversation?.resurrect();
        await conversation?.refreshMessages();

        return conversation as DMConversation;
    }
    async createDM(withGreeting?: boolean) { return await this.internalDM(true, withGreeting); }
    async DM(specificChatId?: string) { return await this.internalDM(false, false, specificChatId); }

    async createGroupChat(options: ICharacterGroupChatCreation) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.client.throwBecauseNotAvailableYet(GROUP_CHATS_NOT_SUPPORTED_YET);
    }
    async getAuthorProfile(): Promise<PublicProfile | PrivateProfile> {
        // if the author is us, give private profile directly else fetch
        const username = this.user__username;
        const myProfile = this.client.myProfile;
        return username == myProfile.username ? myProfile : await this.client.fetchProfileByUsername(username);
    }

    async getVote() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.requester.request(`https://plus.character.ai/chat/character/${this.characterId}/voted/`, {
            method: 'GET',
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        const vote = response["vote"];
        switch (vote) {
            case true: return CharacterVote.Like;
            case false: return CharacterVote.Dislike;
        }

        return CharacterVote.None;
    }
    async setVote(vote: CharacterVote) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.client.throwBecauseNotAvailableYet(CSRF_COOKIE_REQUIRED);

        // vote is true/false/null
        let voteValue: boolean | null = null;
        switch (vote) {
            case CharacterVote.Like: voteValue = true; break;
            case CharacterVote.Dislike: voteValue = false; break;
        }
        
        const request = await this.client.requester.request(`https://plus.character.ai/chat/character/${this.characterId}/vote`, {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ external_id: this.characterId, vote: voteValue }),
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
    }

    async hide() { // (plus) /chat/character/hide
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.client.throwBecauseNotAvailableYet(CSRF_COOKIE_REQUIRED);
    }

    // voice instance or voiceId
    // https://plus.character.ai/chat/character/${characterId}/voice_override/update/
    async setVoiceOverride(voiceOrId: CAIVoice | string) {
        let voiceId = voiceOrId;
        
        if (voiceOrId instanceof CAIVoice)
            voiceId = voiceOrId.id;

        const request = await this.client.requester.request(`https://plus.character.ai/chat/character/${this.characterId}/voice_override/update/`, {
            method: 'POST',
            includeAuthorization: true,
            contentType: 'application/json',
            body: Parser.stringify({ voice_id: voiceId })
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
        if (!response.success) throw new Error("Could set voice override");
    }
    async getVoiceOverride(): Promise<string | undefined> {
        const settings = await this.client.fetchSettings();
        const { voiceOverridesIds } = settings;

        return voiceOverridesIds[this.characterId];
    }

    // https://neo.character.ai/recommendation/v1/character/id
    async getSimilarCharacters() { return this.client.getSimilarCharactersTo(this.characterId); }

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

    // /chat/character/update/
    private async internalEdit(archived: boolean, options?: ICharacterModificationOptions) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.client.throwBecauseNotAvailableYet(WEIRD_INTERNAL_SERVER_ERROR);

        const image = this.avatar;
        const prompt = image?.prompt;

        let voiceId = options?.voiceOrId ?? "";
        if (options?.voiceOrId instanceof CAIVoice)
            voiceId = options.voiceOrId.id;

        const request = await this.client.requester.request("https://plus.character.ai/chat/character/update/", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                external_id: this.externalId,
                title: options?.newTagline ?? this.tagline,
                name: options?.newName ?? this.name,
                categories: [],
                visbility: options?.newVisbility ?? this.visibility,
                copyable: options?.keepCharacterDefintionPrivate ?? this.copyable,
                description: options?.newDescription ?? this.description,
                greeting: options?.newGreeting ?? this.greeting,
                definition: options?.newDefinition ?? this.definition,
                avatar_rel_path: image?.endpointUrl ?? this.avatar.endpointUrl,
                img_gen_enabled: prompt != undefined,
                dynamic_greeting_enabled: options?.enableDynamicGreeting ?? this.dynamicGreetingEnabled,
                base_img_prompt: prompt ?? '',
                strip_img_prompt_from_msg: false,
                voice_id: "",
                default_voice_id: voiceId ?? this.defaultVoiceId,
                archived
            }),
            contentType: 'application/json'
        });
        
        const response = await Parser.parseJSON(request);
        if (!request.ok || response.status != "OK") throw new Error(response.status);

        ObjectPatcher.patch(this.client, this, response.character);
    }
    async edit(options?: ICharacterModificationOptions) { return await this.internalEdit(false, options); }
    async delete() { return await this.internalEdit(true); }

    // persona
    async setPersonaOverride(personaOrId: string | Persona) {
        if (personaOrId instanceof Persona)
            personaOrId = personaOrId.id;

        await this.client.setPersonaOverrideFor(this.characterId, personaOrId);
    }
    async getPersonaOverride(): Promise<Persona | undefined> { return await this.client.getPersonaOverrideFor(this.characterId); }
    
    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        
        // can edit profile picture
        this.avatar = new CAIImage(client, () => 
            this.creator_id != this.client.myProfile.userId &&
            this.user__username != this.client.myProfile.username
        );

        ObjectPatcher.patch(this.client, this, information);
    }
}

export { CharacterVisibility };
