export interface IDefaultCharacter {
    externalId?: string;
    title?: string;
    visibility?: Visibility;
    copyable?: boolean;
    greeting?: string;
    description?: string;
    avatarFileName?: string;
    imageGenerationEnabled?: boolean;
    definition?: string;
    defaultVoiceId?: string;
    authorUsername?: string;
    participantName?: string;
    interactionCount?: number;
}

export class DefaultCharacter {
    externalId: string = "";
    title: string = "";
    visibility: Visibility = Visibility.Public;
    copyable: boolean = false;
    greeting: string = "";
    description: string = "";
    avatarFileName: string = "";
    imageGenerationEnabled: boolean = false;
    definition: string = "";
    defaultVoiceId: string = "";

    // user__username
    authorUsername: string = "";

    // participant__name
    participantName: string = "";

    // participant__num_interactions
    // num_interactions
    interactionCount: number = 0;

    stripImagePromptFromMessage: boolean = false;

    /* methods */
    protected setIfExists(property: string, target: any) {
        if (target == undefined) return;
        (this as any)[property] = target;
    }

    protected load(information: IDefaultCharacter) {

    }
}

export class Character extends DefaultCharacter {
    name: string = "";

    identifier: string = "";

    songs = []; // TODO: type this
    baseImagePrompt: string = "";
    imagePromptRegex: string = "";
    startPrompts: any; // TODO: type this
    commentsEnabled: boolean = true;
    shortHash: string = "";

    // participant__user_username
    participantUserUsername: string = "";


    voiceId: string = "";
    usage: string = "default";
    upvotes: number = 0;
}
