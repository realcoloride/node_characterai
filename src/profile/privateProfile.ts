import { CharacterAI, CheckAndThrow } from "../client";
import Parser from "../parser";
import { CAIImage } from "../utils/image";
import { PublicProfile } from "./publicProfile";
import { getterProperty, hiddenProperty } from "../utils/specable";
import { Character, CharacterVisibility } from "../character/character";
import { CAIVoice, VoiceGender, VoiceVisibility } from "../voice";
import { Persona } from "./persona";
import { ICharacterCreationExtraOptions } from "../character/characterEnums";
import { createIdentifier } from "../utils/identifier";

export interface IProfileModification {
    // username
    username?: string,

    // name
    displayName?: string,

    // bio
    bio?: string,

    /**
     * Sends avatar to be updated or else uses the cached one.
     * Make sure to call `avatar.uploadChanges()` before calling this!
     */
    editAvatar?: boolean
}

export class PrivateProfile extends PublicProfile {
    public characters: Character[] = [];
    @hiddenProperty
    public avatar: CAIImage;

    // is_human
    @hiddenProperty
    private is_human = true;
    @getterProperty
    public get isHuman() { return this.is_human; }
    public set isHuman(value) { this.is_human = value; }

    // email
    public email = "";

    // needs_to_aknowledge_policy
    @hiddenProperty
    private needs_to_aknowledge_policy = true;
    @getterProperty
    public get needsToAknowledgePolicy() { return this.needs_to_aknowledge_policy; }
    public set needsToAknowledgePolicy(value) { this.needs_to_aknowledge_policy = value; }

    // suspended_until
    @hiddenProperty
    private suspended_until: any;
    @getterProperty
    public get suspendedUntil() { return this.suspended_until; }
    public set suspendedUntil(value) { this.suspended_until = value; }

    // hidden_characters
    @hiddenProperty
    private hidden_characters: Character[] = []; // TODO
    @getterProperty
    public get hiddenCharacters() { return this.hidden_characters; }
    public set hiddenCharacters(value) { this.hidden_characters = value; }

    // blocked_users
    @hiddenProperty
    private blocked_users: any[] = []; // TODO
    @getterProperty
    public get blockedUsers() { return this.blocked_users; }
    public set blockedUsers(value) { this.blocked_users = value; }

    // interests
    @hiddenProperty
    private interests?: any[] | null = null;

    // id
    @hiddenProperty
    private id = 0;
    @getterProperty
    public get userId() { return this.id; }
    public set userId(value) { this.id = value; }

    // edit without paramaters will just send an update
    async edit(options?: IProfileModification) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/update/", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                username: options?.username ?? this.username,
                name: options?.displayName ?? this.displayName,
                avatar_type: "UPLOADED",
                avatar_rel_path: options?.editAvatar ?? this.avatar.endpointUrl,
                bio: options?.bio ?? this.bio
            }),
            contentType: 'application/json'
        });
        
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response.status);
    }

    // creation
    async createCharacter(
        name: string,
        greeting: string,
        visbility: CharacterVisibility,

        options?: ICharacterCreationExtraOptions
    ): Promise<Character> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const image = options?.avatar;
        const prompt = image?.prompt;

        let voiceId = options?.voiceOrId ?? "";
        if (options?.voiceOrId instanceof CAIVoice)
            voiceId = options.voiceOrId.id;

        const request = await this.client.requester.request("https://plus.character.ai/chat/character/create/", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                title: options?.tagline ?? "",
                name,
                identifier: createIdentifier(),
                categories: [],
                visbility,
                copyable: options?.keepCharacterDefintionPrivate ?? false,
                allow_dynamic_greeting: options?.allowDynamicGreeting ?? false,
                description: options?.description ?? "",
                greeting,
                definition: options?.definition ?? "",
                avatar_rel_path: image?.endpointUrl ?? '',
                img_gen_enabled: prompt != undefined,
                base_img_prompt: prompt ?? '',
                strip_img_prompt_from_msg: false,
                default_voice_id: voiceId
            }),
            contentType: 'application/json'
        });
        
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response.status);

        return new Character(this.client, response.character);
    }

    // https://neo.character.ai/multimodal/api/v1/voices/
    async createVoice(
        name: string,
        description: string, 
        makeVoicePublic: boolean, 
        previewText: string,
        audioFile: Blob,
        gender?: VoiceGender
    ): Promise<CAIVoice> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        gender ??= VoiceGender.Neutral;
        const payload = {
            voice: {
                name,
                description,
                gender,
                previewText,
                visibility: makeVoicePublic ? VoiceVisibility.Public : VoiceVisibility.Private,
                audioSourceType: 'file'
            }
        };

        // create first, upload later
        const creationRequest = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/voices/", {
            method: 'POST',
            formData: { json: Parser.stringify(payload), file: audioFile },
            includeAuthorization: true
        });

        const creationResponse = await Parser.parseJSON(creationRequest);
        if (!creationRequest.ok) throw new Error(creationResponse.message ?? String(creationResponse));

        // publish character now by editing (same endpoint)
        const voice = new CAIVoice(this.client, creationResponse.voice);
        await voice.edit(name, description, makeVoicePublic, previewText);

        return voice;
    }

    // v1/voices/user
    async getVoices(): Promise<CAIVoice[]> { return await this.client.fetchMyVoices(); }

    async refreshProfile() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/", {
            method: 'GET',
            includeAuthorization: true
        });
        const response = await Parser.parseJSON(request);

        if (!request.ok) throw new Error(response);
        const { user } = response.user;

        this.loadFromInformation(user);
        this.loadFromInformation(user.user);
    }

    async fetchPersona(personaId: string): Promise<Persona | undefined> {
        const personas = await this.fetchPersonas();
        return personas.find(persona => persona.externalId == personaId);
    }
    async getDefaultPersona(): Promise<Persona | undefined> {
        const settings = await this.client.fetchSettings();
        return await settings.fetchDefaultPersona();
    }
    async setDefaultPersona(personaOrId: Persona | string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        let defaultPersonaId = personaOrId;
        if (personaOrId instanceof Persona) 
            defaultPersonaId = personaOrId.externalId;

        const request = await this.client.requester.request("https://neo.character.ai/recommendation/v1/category", {
            method: 'POST',
            contentType: 'application/json',
            includeAuthorization: true,
            body: Parser.stringify({ default_persona_id: defaultPersonaId })
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
        if (!response.success) throw new Error("Could not set default persona");
    }
    async createPersona(
        name: string, 
        definition: string,
        makeDefaultForChats: boolean,
        image?: CAIImage
    ) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const prompt = image?.prompt;
        const request = await this.client.requester.request(`https://plus.character.ai/chat/persona/create/`, {
            method: 'POST',
            contentType: 'application/json',
            body: Parser.stringify({ 
                title: name,
                name,
                identifier: createIdentifier(),
                categories: [],
                visbility: "PRIVATE",
                copyable: false,
                description: "This is my persona.",
                definition,
                greeting: "Hello! This is my persona",
                avatar_rel_path: image?.endpointUrl ?? '',
                img_gen_enabled: prompt != undefined,
                base_img_prompt: prompt ?? '',
                avatar_file_name: '',
                voice_id: '',
                strip_img_prompt_from_msg: false
            }),
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        const persona = new Persona(this.client, response.persona);
        if (makeDefaultForChats) await this.setDefaultPersona(persona.externalId);
        
        return persona;
    }
    // personas/?force_refresh=0
    async fetchPersonas() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const request = await this.client.requester.request("https://plus.character.ai/chat/personas/?force_refresh=0", {
            method: 'GET',
            includeAuthorization: true
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        const rawPersonas = response.personas;

        let personas: Persona[] = [];
        for (let i = 0; i < rawPersonas.length; i++)
            personas.push(new Persona(this.client, rawPersonas[i]));

        return personas;
    }
    async removePersona(personaId: string) {
        const persona = await this.fetchPersona(personaId);
        await persona?.remove();
    }
    async getLikedCharacters() { return this.client.getLikedCharacters(); }

    constructor(client: CharacterAI) {
        super(client);
        this.avatar = new CAIImage(client);
    }
}