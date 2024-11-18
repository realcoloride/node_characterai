import CharacterAI, { CheckAndThrow } from '../client';
import Parser from '../parser';
import fs from 'fs';
import { getterProperty, hiddenProperty, Specable } from '../utils/specable';
import sharp, { Sharp } from 'sharp';
import { NEEDS_MOBILE_DOMAIN } from './unavailableCodes';

const baseEndpoint = "https://characterai.io/i/200/static/avatars/";

// class to contain cai related images
export class CAIImage extends Specable {
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
    @getterProperty
    public get isSharpImageLoaded() { return this.sharpImage != undefined; }

    // if image is uploaded to cai
    @hiddenProperty
    private _isImageUploaded: boolean = false;
    @getterProperty
    public get isImageUploaded() { return this._isImageUploaded; }

    public getFullUrl() { return `${baseEndpoint}${this.endpointUrl}`; }

    private canUploadChanges: Function;
    
    // pipeline:
    // create image or load image:
    // get a buffer
    // * buffer makes SHARP IMAGE

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
        
        // TODO: Weird issues with permissions are going on here and need a fix ASAP
        //       AFTER REVIEWING, it is best to just find the mobile endpoint
        this.client.throwBecauseNotAvailableYet(NEEDS_MOBILE_DOMAIN);

        this._isImageUploaded = false;

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
        if (!request.ok) throw new Error("Could not upload picture");
        
        this._endpointUrl = response[0].result.data.json;
        this._isImageUploaded = true;
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
    async changeToPrompt(prompt: string, isAvatarPrompt: boolean) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.client.throwBecauseNotAvailableYet(NEEDS_MOBILE_DOMAIN);

        // TODO: check if generating works right since its cloudflare protected
        const request = await this.client.requester.request(`https://plus.character.ai/chat/${(isAvatarPrompt ? "character/generate-avatar-options" : "chat/generate-image")}`, {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify(isAvatarPrompt 
                ? { prompt, num_candidates: 4, model_version: "v1" }
                : { image_description: prompt })
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        this._prompt = prompt;
        
        const url = response[0].result[0].url;
        this.makeSharpImage(await this.downloadImageBuffer(url));
    }

    constructor(client: CharacterAI, canUploadChanges: Function | boolean = true) {
        super();
        this.client = client;
        this.canUploadChanges = 
            typeof canUploadChanges == 'boolean' ? () => canUploadChanges : canUploadChanges;
    }
}