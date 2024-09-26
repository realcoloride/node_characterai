import Jimp from "jimp";
import { ICharacterCreation } from "../character/modification";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { CAIImage, EditableCAIImage } from "../utils/image";
import { PrivateProfileCharacter, PublicProfileCharacter } from "./profileCharacter";
import { PublicProfile } from "./publicProfile";
import ObjectPatcher from "../utils/patcher";
import { getterProperty, hiddenProperty } from "../character/character";

export interface IProfileModification {
    // username
    username?: string,

    // name
    displayName?: string,

    // avatar_type (TODO FIGURE OUT)

    // avatar_rel_path
    avatar?: CAIImage,

    // bio
    bio?: string
}

export class PrivateProfile extends PublicProfile {
    public characters: PrivateProfileCharacter[] = [];
    @hiddenProperty
    public avatar: EditableCAIImage;

    // is_human
    @hiddenProperty
    private is_human = true;
    @getterProperty
    public get isHuman() { return this.is_human; }
    public set isHuman(value) { this.is_human = value; }

    // email
    private email = "";

    // needs_to_aknowledge_policy
    @hiddenProperty
    private needs_to_aknowledge_policy = true;
    @getterProperty
    public get needsToAknowledgePolicy() { return this.needs_to_aknowledge_policy; }
    public set needsToAknowledgePolicy(value) { this.needs_to_aknowledge_policy = value; }

    // suspended_until
    @hiddenProperty
    private suspended_until: any; // TODO
    @getterProperty
    public get suspendedUntil() { return this.suspended_until; }
    public set suspendedUntil(value) { this.suspended_until = value; }

    // hidden_characters
    @hiddenProperty
    private hidden_characters: PublicProfileCharacter[] = []; // TODO
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
    interests?: any[] | null = null; // TODO

    // id
    @hiddenProperty
    private id = 0;
    @getterProperty
    public get userId() { return this.id; }
    public set userId(value) { this.id = value; }

    async edit(options: IProfileModification) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/update/", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                username: options.username ?? this.username,
                name: options.displayName ?? this.displayName,
                avatar_type: "UPLOADED",
                avatar_rel_path: options.avatar?.endpointUrl ?? this.avatar.endpointUrl,
                bio: options.bio ?? this.bio
            }),
            contentType: 'application/json'
        });
        
        const response = await Parser.parseJSON(request);
        console.log({ 
            username: options.username ?? this.username,
            name: options.displayName ?? this.displayName,
            avatar_type: "UPLOADED",
            avatar_rel_path: options.avatar?.endpointUrl ?? this.avatar.endpointUrl,
            bio: options.bio ?? this.bio
        });
        if (!request.ok) throw new Error(response.status);
    }

    constructor(client: CharacterAI) {
        super(client);
        this.avatar = new EditableCAIImage(client, async() => await this.edit({ avatar: this.avatar }));
    }

    // characters
    async createCharacter(options: ICharacterCreation) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                avatar_rel_path: options.avatar.endpointUrl
            })
        });
        const response = await Parser.parseJSON(request);

        if (!request.ok) throw new Error(response);
        this.loadFromInformation(response);
    }


    async fetchHiddenCharacters() {

    }

    async fetch() {
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
}