import CAIClient from "./client";
import PrivateProfile from "./profile/privateProfile";
import { PrivateProfileCharacter } from "./profile/profileCharacter";
import { PublicProfile } from "./profile/publicProfile";
import { CAIImage as CAIImage } from "./utils/image";
import ObjectPatcher from "./utils/patcher";

export enum CharacterVote {
    None,
    Like,
    Dislike,
}

export class Character {
    protected client: CAIClient;

    // external_id
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
    public avatar: CAIImage = new CAIImage();

    // img_gen_enabled
    private img_gen_enabled = "";
    public get imageGenerationEnabled() { return this.img_gen_enabled; }
    public set imageGenerationEnabled(value) { this.img_gen_enabled = value; }

    //definition: string = "";

    // default_voice_id
    private default_voice_id = "";
    public get defaultVoiceId() { return this.default_voice_id; }
    public set defaultVoiceId(value) { this.default_voice_id = value; }

    // participant__name / aka display name
    private participant__name = "";
    public get displayName() { return this.participant__name; }
    public set displayName(value) { this.participant__name = value; }

    // user__username / aka author
    protected user__username = "";

    // participant__num_interactions
    // num_interactions
    private participant__num_interactions?: string = undefined;
    private num_interactions?: string = undefined;
    public get interactionCount() { return this.participant__name || this.num_interactions; }
    public set interactionCount(value) { 
        if (this.participant__num_interactions) this.participant__num_interactions = value;
        if (this.num_interactions) this.num_interactions = value;
    }

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

    constructor(client: CAIClient, information: any) {
        this.client = client;
        ObjectPatcher.patch(this, information);
    }
}

