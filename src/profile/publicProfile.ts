import Parser from '../parser';
import CAIClient from '../client';

class ProfileCharacters {

    
    async get() {

    }

    constructor(profile: PublicProfile) {

    }
}



class ProfileVoices {



}

export class PublicProfile {
    username = "";
    id: number = 0;
    // first_name
    displayName = "";
    // is_staff
    isStaff : boolean = false;
    bio = "";


    // for actions
    protected client: CAIClient;
    public characters: ProfileCharacters;

    constructor(client: CAIClient, options?: any) {
        this.client = client;
        this.characters = new ProfileCharacters(this);
    }
    
    // character management


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

    async fetch() {
        const request = await this.client.requester.request("https://plus.character.ai/chat/user/", {
            method: 'GET',
            includeAuthorization: true
        });

        console.log(await Parser.parseJSON(request));

    }
}
