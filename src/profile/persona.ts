import { CharacterAI, CheckAndThrow } from "../client";
import Parser from "../parser";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty, Specable } from "../utils/specable";

export interface IPersonaEditOptions {
    name?: string, 
    definition?: string,
    image?: CAIImage
}

export class Persona extends Specable {
    @hiddenProperty
    private client: CharacterAI;

    // external_id
    @hiddenProperty
    private external_id = "";
    @getterProperty
    public get externalId() { return this.external_id; }

    /**
     * This variable redirects to `externalId`
     */
    @getterProperty
    public get id() { return this.external_id; }

    // title
    @hiddenProperty
    private title = "";

    // name
    @hiddenProperty
    private name = "";

    // visibility
    @hiddenProperty
    private visibility: string = "PRIVATE";

    // copyable
    @hiddenProperty
    private copyable = false;

    @hiddenProperty
    private greeting = "";

    @hiddenProperty
    private description = "";

    @hiddenProperty
    private identifier = "";

    // avatar_file_name
    @hiddenProperty
    public avatar: CAIImage;

    // songs
    @hiddenProperty
    private songs = [];

    // img_gen_enabled    
    @hiddenProperty
    private img_gen_enabled = false;
    @getterProperty
    public get imageGenerationEnabled() { return this.img_gen_enabled; }
    public set imageGenerationEnabled(value) { this.img_gen_enabled = value; }

    // base_img_prompt
    @hiddenProperty
    private base_img_prompt = "";
    @getterProperty
    public get baseImagePrompt() { return this.base_img_prompt; }
    public set baseImagePrompt(value) { this.base_img_prompt = value; }

    @hiddenProperty
    private img_prompt_regex = "";

    @hiddenProperty
    private strip_img_prompt_from_msg = "";

    // definition
    public definition = "";

    // default_voice_id
    @hiddenProperty
    private default_voice_id = "";
    public get defaultVoiceId() { return this.default_voice_id; }

    // starter_prompts
    @hiddenProperty
    private starter_prompts = [];

    // is_persona
    @hiddenProperty
    private comments_enabled = false;

    // categories
    @hiddenProperty
    private categories = [];

    // user__id
    @hiddenProperty
    private user__id = 0;

    // user__username / userusername
    @hiddenProperty
    private user__username: string | undefined = undefined;
    @hiddenProperty
    private userusername: string | undefined = undefined;
    @getterProperty
    public get authorUsername() { return this.user__username ?? this.userusername; }

    // participantname / participant__name
    @hiddenProperty
    private participantname: string | undefined = undefined;
    @hiddenProperty
    private participant__name: string | undefined = undefined;
    @getterProperty
    public get participantName() { return this.participantname ?? this.participant__name; }

    // participantuserusername
    @hiddenProperty
    private participantuserusername: string | undefined = undefined;

    // is_persona
    @hiddenProperty
    private is_persona = true;

    @hiddenProperty
    private participant__num_interactions = 0;
    @hiddenProperty
    private num_interactions = 0;
    @getterProperty
    public get interactionCount() { return this.participant__num_interactions ?? this.num_interactions; }

    @hiddenProperty
    private background = "";


    private async internalEdit(options: IPersonaEditOptions, archived: boolean | undefined = undefined) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        let { external_id, title, greeting, description, definition, visibility, copyable, default_voice_id, is_persona } = this;

        const image = options.image;
        const prompt = image?.prompt;
        
        const name = options.name ?? this.participantName;
        const userId = this.user__id ?? 1;
        definition = options.definition ?? definition;

        const request = await this.client.requester.request(`https://plus.character.ai/chat/persona/update/`, {
            method: 'POST',
            contentType: 'application/json',
            body: Parser.stringify({ 
                archived,
                external_id,
                title,
                greeting,
                description,
                definition,
                avatar_file_name: '',
                visibility,
                copyable,
                participantname: name,
                participantnum_interactions: 0,
                userid: userId,
                userusername: this.authorUsername,
                img_gen_enabled: prompt != undefined,
                default_voice_id,
                is_persona,
                name,
                avatar_rel_path: image?.endpointUrl ?? '',
                enabled: true
            }),
            includeAuthorization: true
        });
        
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
        
        ObjectPatcher.patch(this.client, this, response.persona);
    }
    async edit(options: IPersonaEditOptions) { return await this.internalEdit(options) }
    async makeDefault() { return await this.client.myProfile.setDefaultPersona(this.externalId); }
    async remove() { return await this.internalEdit({}, true); }

    constructor(client: CharacterAI, information: any) {
        super();
        this.avatar = new CAIImage(client, false);
        this.client = client;
        ObjectPatcher.patch(client, this, information);
    }
}