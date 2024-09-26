import Jimp from 'jimp';
import CharacterAI, { CheckAndThrow } from '../client';
import Parser from '../parser';
import { PathLike } from 'fs';
import { getterProperty, hiddenProperty } from '../character/character';
const baseEndpoint = "https://characterai.io/i/200/static/avatars/";

// class to contain cai related images
export class CAIImage {
    // field is get only
    @hiddenProperty
    private client: CharacterAI;

    @hiddenProperty
    private _endpointUrl = "";
    @getterProperty
    public get endpointUrl() { return this._endpointUrl; }

    // prompt used to generate the image
    @hiddenProperty
    private _prompt = "";
    @getterProperty
    public get prompt() { return this._prompt; }

    // cannot be set
    @hiddenProperty
    private jimpImage?: Jimp = undefined;
    // if image is loaded
    @hiddenProperty
    private loaded: boolean = false;
    
    // to do image operations
    async getJimpImage() {
        if (this.loaded) return this.jimpImage;

        await this.load();
        return this.jimpImage;
    }

    getFullUrl() { return `${baseEndpoint}${this.endpointUrl}`; }

    protected changeCallback?: Function;

    private async upload() {
        if (!this.changeCallback) throw new Error("You cannot change this image.");
        
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.loaded = false;
        
        const endpointUrl = await this.changeCallback();
        this.loaded = true;

        return endpointUrl;
    }

    // these change the image / avatarPrompt will do avatar options
    async changeToPrompt(prompt: string, avatarPrompt = false) {
        this.loaded = false;

        const request = await this.client.requester.request(`https://plus.character.ai/chat/${(avatarPrompt ? "character/generate-avatar-options" : "chat/generate-image")}`, {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify(avatarPrompt 
                ? { prompt, num_candidates: 4, model_version: "v1" }
                : { image_description: prompt })
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        this._endpointUrl = response[0].result[0].url;
        await this.load();
        
        if (this.changeCallback) await this.changeCallback();
    }
    
    async changeToUrl(pathOrUrl: string) {
        this.loaded = false;

        this.jimpImage = await Jimp.read(pathOrUrl);
        this._endpointUrl = await this.upload();
        this.loaded = true;

        if (this.changeCallback) await this.changeCallback();
    }
    async changeToEndpointUrl(endpointUrl: string) {
        this.loaded = false;        

        this._endpointUrl = endpointUrl;
        await this.load();

        if (this.changeCallback) await this.changeCallback();
    }
    // remains unloaded however and no callbacks will be called
    changeToEndpointUrlSync(endpointUrl: string) {
        this.loaded = false;        
        this._endpointUrl = endpointUrl;
    }

    // loads the image it hasn't been loaded yet from the endpoint
    private async load() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        this.jimpImage = await Jimp.read(this.getFullUrl());
        this.loaded = true;
    }

    constructor(client: CharacterAI) {
        this.client = client;
    }
}


// with extra callback to save and upload :)
export class EditableCAIImage extends CAIImage {
    // to call if you just changed something with the jimp image
    async uploadChanges() {
        if (this.changeCallback) await this.changeCallback();
    }

    constructor(client: CharacterAI, changeCallback: Function) {
        super(client);
        this.changeCallback = changeCallback;
    }
}
