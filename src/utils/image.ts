import Jimp from 'jimp';
import CharacterAI from '../client';
import Parser from '../parser';
import { PathLike } from 'fs';
import { getterProperty, hiddenProperty } from '../character/character';
const baseEndpoint = "https://characterai.io/i/200/static/avatars/";

// class to contain cai related images
export class CAIImage {
    // field is get only
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
    private jimpImage: Jimp;
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

    private async upload(image: Jimp) {
        this.client.checkAndThrow(true, false);

        this.loaded = false;
        const base64 = await image.getBase64Async(-1);

        const request = await this.client.requester.request("https://character.ai/api/trpc/user.uploadAvatar?batch=1", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({"0": { json: { imageDataUrl: base64 } }})
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        return response[0].result.data.json;
    }

    // these change the image
    async changeToPrompt(prompt: string) {
        this.loaded = false;

        const request = await this.client.requester.request("https://plus.character.ai/chat/character/generate-avatar-options", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ prompt, num_candidates: 4, model_version: "v1" })
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
        this._endpointUrl = await this.upload(this.jimpImage);
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
        this.client.checkAndThrow(true, false);

        this.jimpImage = await Jimp.read(this.getFullUrl());
        this.loaded = true;
    }

    constructor(client: CharacterAI) {
        this.client = client;
        this.jimpImage = new Jimp(); // temporary instance for constructor (epic memory usage)
    }
}


// with extra callback to save and upload :)
export class EditableCAIImage extends CAIImage {
    // to call if you just changed something with the jimp image
    async updateIfChanged() {
        if (this.changeCallback) await this.changeCallback();
    }

    constructor(client: CharacterAI, changeCallback: Function) {
        super(client);
        this.changeCallback = changeCallback;
    }
}
