import { Character } from "../character/character";
import CAIClient from "../client";
import { EditableCAIImage } from "../utils/image";
import { PrivateProfile } from "./privateProfile";

export class PublicProfileCharacter extends Character {

}
export class PrivateProfileCharacter extends Character {
    public avatar: EditableCAIImage;
    constructor(client: CAIClient, information: any) {
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