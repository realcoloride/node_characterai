import { hiddenProperty } from "../utils/specable";
import CharacterAI from "../client";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";

export class Message {
    @hiddenProperty
    private client: CharacterAI;

    public image?: CAIImage;

    async edit() {

    }
    async pin() {

    }
    async copyFromHere() {

    }
    async delete() {

    }
    
    constructor(client: CharacterAI, turn: any) {
        this.client = client;
        ObjectPatcher.patch(this.client, this, turn);
    }
}