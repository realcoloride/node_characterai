import { CAIImage } from "../utils/image";
import { CAIVoice } from "../voice";

export enum CharacterVote {
    None,
    Like,
    Dislike
};

export enum CharacterVisibility {
    Private = "PRIVATE",
    Unlisted = "UNLITSTED",
    Public = "PUBLIC",
};

export interface ICharacterCreationExtraOptions {
    tagline?: string;
    description?: string;

    definition?: string,
    keepCharacterDefintionPrivate?: boolean,

    voiceOrId?: CAIVoice | string,
    avatar?: CAIImage
}

export interface ICharacterModificationOptions extends ICharacterCreationExtraOptions {
    name?: string,
    greeting?: string,
    visbility?: CharacterVisibility
}