import Parser from '../parser';
import CAIClient from '../client';
import { CAIImage as CAIImage } from '../utils/image';
import ObjectPatcher from '../utils/patcher';
import { PublicProfileCharacter } from './profileCharacter';
import { hiddenProperty } from '../character';

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
    public get displayName() { return this.name; }
    public set displayName(value) { this.name = value; }

    // num_following
    @hiddenProperty
    private num_following = 0;
    public get followingCount() { return this.num_following; }
    public set followingCount(value) { this.num_following = value; }

    // num_followers
    @hiddenProperty
    private num_followers = 0;
    public get followersCount() { return this.num_followers; }
    public set followersCount(value) { this.num_followers = value; }

    // avatar_file_name
    public avatar: CAIImage = new CAIImage();

    // subscription_type
    public subscriptionType: string = "";
    
    // bio
    public bio = "";

    // creator_info
    public creatorInformation: any;

    // for actions
    protected client: CAIClient;

    constructor(client: CAIClient, options?: any) {
        this.client = client;
        this.loadFromInformation(options);
    }
    
    // character management
    protected loadFromInformation(information: any) {
        if (!information) return;
        const { characters } = information;
        console.log(information);

        ObjectPatcher.patch(this, information);
        this.loadCharacters(characters);
    }
    protected loadCharacters(characters: any[]) {
        if (!characters) return;
        // reset old characters
        this.characters = [];
        characters.forEach(characterInformation => this.characters.push(new PublicProfileCharacter(this.client, characterInformation)));
        
        console.log(this.characters);
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
            throw new Error("Profile not found");

        this.loadFromInformation(response.public_user);
    }
}
