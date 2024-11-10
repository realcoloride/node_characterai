import CharacterAI, { CheckAndThrow } from '../client';
import Parser from '../parser';
import fs from 'fs';
import { getterProperty, hiddenProperty } from '../utils/specable';
import sharp, { Sharp } from 'sharp';

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
    private _prompt?: string = undefined;
    @getterProperty
    public get prompt() { return this._prompt; }

    // cannot be set
    @hiddenProperty
    private sharpImage?: sharp.Sharp = undefined;

    // if sharp image is loaded
    @hiddenProperty
    private get isSharpImageLoaded() { return this.sharpImage != undefined; }

    // if image is uploaded to cai
    @hiddenProperty
    private isImageUploaded: boolean = false;

    public getFullUrl() { return `${baseEndpoint}${this.endpointUrl}`; }

    private canUploadChanges: Function;
    
    // pipeline:
    // create image or load image:
    // get a buffer
    // * buffer makes SHARP IMAGE
    //
    // uploading changes:
    // 
    // 

    private clearSharpImage() {
        this.sharpImage?.destroy();
        delete this.sharpImage;
    }
    async getSharpImage(): Promise<Sharp> {
        if (this.isSharpImageLoaded) return this.sharpImage as Sharp;

        await this.reloadImage();
        return this.sharpImage as Sharp;
    }

    // LOADING methods
    private makeSharpImage(target: Buffer | ArrayBuffer | string) {
        this.clearSharpImage();
        this.sharpImage = sharp(target);
    }
    private async downloadImageBuffer(url: string, headers?: Record<string, string>) {
        return (await fetch(url, { headers })).arrayBuffer();
    }

    public async uploadChanges() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        this.isImageUploaded = false;

        if (!this.canUploadChanges()) throw new Error("You cannot change this image.");
        if (!this.sharpImage) throw new Error("Image not available or not loaded");

        const buffer = await this.sharpImage.toBuffer();
        const base64 = buffer.toString('base64');
    
        // character ai deserves an award for the most batshit confusing endpoints to upload stuff ever
        const payload = { "0": { json: { imageDataUrl: base64 } } }
        const request = await this.client.requester.request("https://character.ai/api/trpc/user.uploadAvatar?batch=1", {
            method: 'POST',
            includeAuthorization: true,
            contentType: 'application/json',
            body: Parser.stringify(payload)
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));
        
        this._endpointUrl = response[0].result.data.json;
        this.isImageUploaded = true;
        
    }

    // THESE CHANGE THE SHARP IMAGE
    async changeToUrl(url: string, headers?: Record<string, string>) {
        this.makeSharpImage(await this.downloadImageBuffer(url, headers));
    }
    public changeToFilePath(path: fs.PathOrFileDescriptor) { this.makeSharpImage(fs.readFileSync(path)); }
    async changeToBlobOrFile(blobOrFile: Blob | File) { this.makeSharpImage(await blobOrFile.arrayBuffer()); }
    public changeToBuffer(buffer: Buffer | ArrayBuffer) { this.makeSharpImage(buffer); }
    async changeToEndpointUrl(endpointUrl: string) {
        // first off do this then load the sharpImage
        this._endpointUrl = endpointUrl;

        // then we download the picture in question
        const url = this.getFullUrl();
        this.makeSharpImage(await this.downloadImageBuffer(url));
    }

    // this pre loads the image by storing the endpoint url to later load it
    public changeToEndpointUrlSync(endpointUrl: string) {
        this.clearSharpImage();
        this._endpointUrl = endpointUrl;
    }

    // use this if you fucked up the sharp image and you need a brand new one
    async reloadImage() {
        // just redownload the image
        await this.changeToEndpointUrl(this._endpointUrl);
    }

    // extra
    async changeToPrompt(prompt: string, avatarPrompt = false) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        this.sharpImage
        const request = await this.client.requester.request(`https://plus.character.ai/chat/${(avatarPrompt ? "character/generate-avatar-options" : "chat/generate-image")}`, {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify(avatarPrompt 
                ? { prompt, num_candidates: 4, model_version: "v1" }
                : { image_description: prompt })
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        this._prompt = prompt;
        await this.changeToEndpointUrl(response[0].result[0].url);
    }

    constructor(client: CharacterAI, canUploadChanges: Function) {
        this.client = client;
        this.canUploadChanges = canUploadChanges;
    }
}