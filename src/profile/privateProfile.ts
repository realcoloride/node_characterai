import { ICharacterCreation } from "../character/modification";
import CharacterAI from "../client";
import Parser from "../parser";
import { EditableCAIImage } from "../utils/image";
import { PrivateProfileCharacter } from "./profileCharacter";
import { PublicProfile } from "./publicProfile";

export default class PrivateProfile extends PublicProfile {
    public characters: PrivateProfileCharacter[] = [];
    public avatar: EditableCAIImage;

    constructor(client: CharacterAI) {
        super(client);
        this.avatar = new EditableCAIImage(client, async() => {
            // TODO REUPLOAD AVATAR HERE
        });
    }

    // characters
    async createCharacter(options: ICharacterCreation) {
        this.client.checkAndThrow(true, false);

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
        this.client.checkAndThrow(true, false);

        const request = await this.client.requester.request("https://plus.character.ai/chat/user/", {
            method: 'GET',
            includeAuthorization: true
        });
        const response = await Parser.parseJSON(request);

        if (!request.ok) throw new Error(response);
        this.loadFromInformation(response);
    }
}