import { Character } from "../character/character";
import CharacterAI from "../client";
import Parser from "../parser";
import { CAIImage } from "../utils/image";
import ObjectPatcher from "../utils/patcher";
import { hiddenProperty, Specable } from "../utils/specable";
import { CharacterVisibility } from "../utils/visibility";

export interface IPersonaExtraCreationOptions {
    image?: CAIImage,
    greeting?: string
}

export class Persona extends Specable {
    @hiddenProperty
    private client: CharacterAI;

    // avatar_file_name
    public avatar: CAIImage;

    // copyable
    @hiddenProperty
    private copyable = false;

    // default_voice_id
    private default_voice_id = "";

    // definition
    public definition = "";
    external_id;
    greeting;
    img_gen_enabled = false;
    is_persona = true;
    participant__name = "";
    participant__num_interactions = 0;
    title = "";
    user__id;
    user__username;
    visibility: string = "PRIVATE";

    /* persona fields */ 
    categories = []; // TODO: type this
    authorId: number = 0;

    background = "";

    async edit() {
        
    }

    async makeDefault() {

    }
    async remove() {

    }

    constructor(client: CharacterAI, information: any) {
        super();
        this.client = client;
        ObjectPatcher.patch(client, this, information)
    }
}