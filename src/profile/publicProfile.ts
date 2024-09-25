import Parser from '../parser';
import CharacterAI from '../client';
import { CAIImage as CAIImage } from '../utils/image';
import ObjectPatcher from '../utils/patcher';
import { PublicProfileCharacter } from './profileCharacter';
import { getterProperty, hiddenProperty } from '../character/character';

class ProfileVoices {

}

export class PublicProfile {
    // characters
    public characters: PublicProfileCharacter[] = [];

    // username
    username = "";
    
    // name
    @hiddenProperty
    private name = "";
    @getterProperty
    public get displayName() { return this.name; }
    public set displayName(value) { this.name = value; }

    // num_following
    @hiddenProperty
    private num_following = 0;
    @getterProperty
    public get followingCount() { return this.num_following; }
    public set followingCount(value) { this.num_following = value; }

    // num_followers
    @hiddenProperty
    private num_followers = 0;
    @getterProperty
    public get followersCount() { return this.num_followers; }
    public set followersCount(value) { this.num_followers = value; }

    // avatar_file_name
    public avatar: CAIImage;

    // subscription_type
    public subscriptionType: string = "";
    
    // bio
    public bio: string | null = "";

    // creator_info
    public creatorInformation: any;

    // for actions
    protected client: CharacterAI;

    constructor(client: CharacterAI, options?: any) {
        this.avatar = new CAIImage(client);
        this.client = client;
        this.loadFromInformation(options);
    }

    // features
    async follow() {
        // sad
        this.client.throwBecauseNotAvailableYet();

        this.client.checkAndThrow(true, false);
        if (this.username == this.client.myProfile.username) throw new Error("You cannot follow yourself!");

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/follow", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ username: this.username })
        });

        if (!request.ok) throw new Error(await Parser.parseJSON(request));
    }
    async unfollow() {
        // sad
        this.client.throwBecauseNotAvailableYet();

        this.client.checkAndThrow(true, false);
        if (this.username == this.client.myProfile.username) throw new Error("You cannot unfollow or follow yourself!");

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/unfollow", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ username: this.username })
        });

        if (!request.ok) throw new Error(await Parser.parseJSON(request));
    }
    async getFollowers(page = 1) {
        this.client.checkAndThrow(true, false);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/followers", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ username: this.username, pageParam: page })
        });
        if (!request.ok) throw new Error(await Parser.parseJSON(request));
    }
    async getFollowing(page = 1) {
        this.client.checkAndThrow(true, false);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/following", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ username: this.username, pageParam: page })
        });
        if (!request.ok) throw new Error(await Parser.parseJSON(request));
    }
    async getLikedCharacters() {
        this.client.checkAndThrow(true, false);
        const request = await this.client.requester.request("https://plus.character.ai/chat/user/characters/upvoted/", {
            method: 'GET',
            includeAuthorization: true
        });

        if (!request.ok) throw new Error(await Parser.parseJSON(request));
    }
    
    // character management
    protected loadFromInformation(information: any) {
        if (!information) return;
        const { characters } = information;

        ObjectPatcher.patch(this.client, this, information);
        this.loadCharacters(characters);
    }
    protected loadCharacters(characters: any[]) {
        if (!characters) return;
        // reset old characters
        this.characters = [];
        characters.forEach(characterInformation => this.characters.push(new PublicProfileCharacter(this.client, characterInformation)));
    }

    async #setProfilePicture(image: any) {
        const base64 = await image.getBase64Async(-1);

        const request = await this.client.requester.request("https://character.ai/api/trpc/user.uploadAvatar?batch=1", {
            method: 'GET',
            includeAuthorization: true,
            body: Parser.stringify({
                "0": {
                    json: {
                        imageDataUrl: base64
                    }
                }
            })
        });
    }

    /*async setProfilePicture(target: string | Buffer | Jimp) {
        
        await this.#setProfilePicture();
        Jimp.read("", (e) => {

        })
        const image = await Jimp.read(target);

        

        
    }
    async getProfilePicture() {
        
    }*/

    // updates profile or fetches it for the first time
    async fetch() {
        this.client.checkAndThrow(true, false);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/public/", {
            method: 'POST',
            includeAuthorization: true,
            contentType: 'application/json',
            body: Parser.stringify({ "username": this.username })
        });

        const response = await Parser.parseJSON(request);

        if (!request.ok || response?.length == 0)
            throw new Error("Profile not found. Watch out! Profile names are case sensitive.");

        this.loadFromInformation(response.public_user);
    }
}
