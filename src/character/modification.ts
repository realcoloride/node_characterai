import { CAIImage } from "../utils/image";
import { CharacterVisibility } from "./character";

export interface ICharacterCreationOptions {
    // avatar_rel_path
    // base_img_prompt
    avatar: CAIImage,
    
    // categories
    // TODO !! categories: [],

    // copyable
    copyable: boolean,

    // default_voice_id
    defaultVoiceId: string,

    // definition
    definition: string,

    // description
    description: string,

    // greeting
    greeting: string,
    
    // identifier

    // img_gen_enabled
    
    // name
    displayName: string,

    // strip_img_prompt_from_msg

    // title
    tagLine: string,
    
    // visibility
    visibility: CharacterVisibility,

    // voice_id
    voiceId: string
};
export interface ICharacterModification {
    // avatar_rel_path
    // base_img_prompt
    avatar?: CAIImage,
    
    // categories
    // TODO !! categories: [],

    // copyable
    copyable?: boolean,

    // default_voice_id
    defaultVoiceId?: string,

    // definition
    definition?: string,

    // description
    description?: string,

    // greeting
    greeting?: string,
    
    // name
    displayName?: string,

    // strip_img_prompt_from_msg

    // title
    tagLine?: string,
    
    // visibility
    visibility?: CharacterVisibility,

    // voice_id
    voiceId?: string
};