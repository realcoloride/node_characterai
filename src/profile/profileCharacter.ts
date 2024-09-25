import { Character, hiddenProperty } from "../character/character";
import CharacterAI from "../client";
import { EditableCAIImage } from "../utils/image";
import { PrivateProfile } from "./privateProfile";

export class PublicProfileCharacter extends Character {

}
export class PrivateProfileCharacter extends Character {
    @hiddenProperty
    public avatar: EditableCAIImage;
    constructor(client: CharacterAI, information: any) {
        super(client, information)
        this.avatar = new EditableCAIImage(client, async () => {
            // TODO upload changes here
        });
    }

    getAuthor() {

    }

    async edit() {

    }
    async delete() {

    }

}