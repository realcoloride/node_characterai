import { Character } from "../character/character";
import CharacterAI from "../client";
import Parser from "../parser";
import { CAIImage } from "../utils/image";
import { hiddenProperty, Specable } from "../utils/specable";
import { CharacterVisibility } from "../utils/visibility";


interface IPersona extends IDefaultCharacter {
    background?: string,
    picture?: CAIImage
}
interface IPersonaCreationOptions {
    title: string,
    background: string,
    picture?: CAIImage
}

class ProfilePersonas extends Specable {
    @hiddenProperty
    private client: CharacterAI;

    constructor(client: CharacterAI) {
        super();
        this.client = client;
    }

    async getPersonas() {

    }

    async setDefaultPersona(persona: Persona) {
        return await this.setDefaultPersonaWithIdentifier(persona.identifier);
    }
    async setDefaultPersonaWithIdentifier(identifier: string) {
        const request = await this.client.requester.request(`https://neo.character.ai/chats/recent/${conversation.chatId}`, {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({
                
            })
        });
    }

    createPersona(persona: IPersonaCreationOptions, makeDefaultForChats: boolean) {

    }
    removePersona(persona: Persona) {

    }
}

class Persona extends Specable {
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
    definition;
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
        const resurectionRequest = await this.requester.request(``, {
            method: 'GET',
            includeAuthorization: true
        });
    }

    async makeDefault() {

    }
    async remove() {

    }

    constructor(options: IPersonaCreationOptions | IPersona) {
        super();

        if (!options.picture) return;

        // todo shit with the picture
    }

    serializeForCreation() {
        const { 
            title, 
            identifier, 
            categories,
            visibility, 
            copyable, 
            description, 
            greeting, 
            definition, 
            avatarRelativePath,
            imageGenerationEnabled,
            baseImagePrompt,
            avatarFileName,
            defaultVoiceId,
            stripImagePromptFromMessage
        } = this;
        const name = title;

        return { title, name, identifier, categories, visibility: visibility as string, copyable, description, greeting, definition, avatar_rel_path: avatarRelativePath, img_gen_enabled: imageGenerationEnabled, base_img_prompt: baseImagePrompt, avatar_file_name: avatarFileName, voice_id: defaultVoiceId, strip_img_prompt_from_msg: stripImagePromptFromMessage };
    }
    serializeForUpdate() {

    }
}