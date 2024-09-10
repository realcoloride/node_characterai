import { PathLike } from "fs";
import Parser from '../parser';
import Jimp from 'jimp';
import { Image } from "@jimp/core";

class ProfileCharacters {

}



class ProfileVoices {



}

class Profile {
    username = "";
    displayName = "";
    bio = "";

    private client: Client = null;

    constructor(client: Client) {
        this.client = client;
    }


    async #setProfilePicture(image: Jimp) {
        const base64 = await image.getBase64Async(-1);

        const request = await this.requester.request("https://character.ai/api/trpc/user.uploadAvatar?batch=1", {
            headers: this.client.getHeaders(),
            body: Parser.stringify({
                "0": {
                    json: {
                        imageDataUrl: base64
                    }
                }
            })
        });
    }

    async setProfilePicture(target: string | Buffer | Jimp) {
        
        await this.#setProfilePicture();
        Jimp.read("", (e) => {

        })
        const image = await Jimp.read(target);

        

        
    }
    async getProfilePicture() {
        
    }

    async fetch() {

    }
}

export default Profile;