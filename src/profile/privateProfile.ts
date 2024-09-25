import { Character } from "../character";
import CAIClient from "../client";
import Parser from "../parser";
import { PrivateProfileCharacter, PublicProfileCharacter } from "./profileCharacter";
import { PublicProfile } from "./publicProfile";

export default class PrivateProfile extends PublicProfile {
    public characters: PrivateProfileCharacter[] = [];

    // characters
    createCharacter() {
        
    }


    async fetchHiddenCharacters() {

    }

    async fetch() {
        this.client.checkAndThrow(true, false);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/", {
            method: 'GET',
            includeAuthorization: true
        });
        const response = await Parser.parseJSON(request);

        if (!request.ok) throw new Error(response);
        console.log(response);
        
    }
}