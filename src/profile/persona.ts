import { Character } from "../character/character";
import { CAIImage } from "../utils/image";

class ProfilePersonas {
    getPersonas() {

    }

    setDefaultPersona(persona: Persona) {

    }
    setDefaultPersonaWithIdentifier(identifier: string) {
        
    }

    addPersona(persona: Persona, makeDefaultForChats: boolean) {

    }
}

interface IPersona extends IDefaultCharacter {
    background?: string,
    picture?: CAIImage
}
interface IPersonaCreationOptions {
    title: string,
    background: string,
    picture?: CAIImage
}

class Persona extends Character {

    /* persona fields */ 
    categories = []; // TODO: type this
    authorId: number = 0;

    background = "";

    constructor(options: IPersonaCreationOptions | IPersona) {
        super();
        this.load(options);
        this.setIfExists("background", options.background);

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