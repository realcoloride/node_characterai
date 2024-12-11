import { CharacterAI, CheckAndThrow } from "../client";
import Parser from '../parser';
import fs from 'fs';
import { getterProperty, hiddenProperty, Specable } from '../utils/specable';
import sharp, { Sharp } from 'sharp';

const neoImageEndpoint = "https://characterai.io/i/200/static/avatars/";
const betaImageEndpoint = "https://characterai.io/i/400/static/user/";

export interface IGeneratedImage {
    prompt: string,
    url: string
}

// class to contain cai related images
/**
 * Holds a cached manipulated {@link Sharp} image instance to be edited and interacted with.
 */
export class CAIImage extends Specable {
    // field is get only
    @hiddenProperty
    private client: CharacterAI;

    @hiddenProperty
    private imageEndpoint = neoImageEndpoint;

    @hiddenProperty
    private _endpointUrl = "";
    @getterProperty
    public get endpointUrl() { return this._endpointUrl; }

    public get hasImage() { return this.endpointUrl != ""; }

    /**
     * Gets full image URL (if available). Often returns into a `.webp` format.
     * To manipulate, save the file, or do more, use {@link getSharpImage} instead.
     */
    public get fullUrl() { return this._endpointUrl != "" ? `${this.imageEndpoint}${this._endpointUrl}` : ""; }

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

    private canUploadChanges: Function;
    
    // pipeline:
    // create image or load image:
    // get a buffer
    // * buffer makes SHARP IMAGE

    private clearSharpImage() {
        this.sharpImage?.destroy();
        delete this.sharpImage;
    }
    /**
     * Gets a {@link Sharp} image instance to manipulate the image.
     * @returns Sharp manipulable image
     */
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
        if (!this.hasImage) console.warn("[node_characterai] No images are loaded or assigned to this cached image. This could either mean the image doesn't have any fallback or it doesn't exist.");
        return (await fetch(url, { headers })).arrayBuffer();
    }

    /**
     * Uploads the internally stored image to CharacterAI and updates the cached image.
     * @warning This DOES not automatically apply the changes to the avatar, image, etc.. This has to be called with its appropriate `edit()` like or relevant method.
     */
    public async uploadChanges() {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        this._isImageUploaded = false;

        if (!this.canUploadChanges()) throw new Error("You cannot change this image or upload changes for it.");
        if (!this.sharpImage) throw new Error("Image not available or not loaded");

        const buffer = await this.sharpImage.toBuffer();
        const file = new File([buffer], "image.png", { type: "image/png" });
        
        // character ai deserves an award for the most batshit confusing endpoints to upload stuff ever
        const uploadRequest = await this.client.requester.request("https://beta.character.ai/chat/upload-image/", {
            method: 'POST',
            includeAuthorization: true,
            formData: { image: file },
            fileFieldName: 'image'
        });

        const uploadResponse = await Parser.parseJSON(uploadRequest);
        if (!uploadRequest.ok) throw new Error("Could not upload picture");
        
        const uploadURL = uploadResponse.value;
        const checkRequest = await this.client.requester.request(`${betaImageEndpoint}${uploadURL}`, {
            method: 'GET',
            includeAuthorization: true
        });
        if (checkRequest.status != 200) throw new Error(await Parser.parseJSON(checkRequest));

        this._isImageUploaded = true;

        // https://characterai.io/i/400/static/user/temp-images/uploaded/*/*/*/*
        await this.changeToEndpointUrl(uploadURL, betaImageEndpoint);
    }

    // THESE CHANGE THE SHARP IMAGE
    /**
     * Changes the internally stored image cache to a specific url.
     * @param url URL of the image
     * @param headers Additional optional headers
     */
    async changeToUrl(url: string, headers?: Record<string, string>) {
        this.makeSharpImage(await this.downloadImageBuffer(url, headers));
    }
    /**
     * Changes the internally stored image cache to a file path.
     * @param path The absolute or relative file path of the image
     */
    public changeToFilePath(path: fs.PathOrFileDescriptor) { this.makeSharpImage(fs.readFileSync(path)); }
    /**
     * Changes the internally stored image cache to a specific {@link Blob} or {@link File}.
     * @param blobOrFile Blob or File instance
     */
    async changeToBlobOrFile(blobOrFile: Blob | File) { this.makeSharpImage(await blobOrFile.arrayBuffer()); }
    /**
     * Changes the internally stored image cache to a {@link Buffer}.
     * @param buffer Buffer or ArrayBuffer instance
     */
    public changeToBuffer(buffer: Buffer | ArrayBuffer) { this.makeSharpImage(buffer); }
    /**
     * Changes the internally stored image cache to a related Character.AI endpoint image. 
     * Do not use if you do not understand what this means.
     * @param endpointUrl Related (neo) endpoint URL
     * @param neoImageEndpoint Custom endpoint if required
     */
    async changeToEndpointUrl(endpointUrl: string, imageEndpoint: string = neoImageEndpoint) {
        // first off do this then load the sharpImage
        this.imageEndpoint = imageEndpoint;
        this._endpointUrl = endpointUrl;

        // then we download the picture in question
        this.makeSharpImage(await this.downloadImageBuffer(this.fullUrl));
    }

    // this pre loads the image by storing the endpoint url to later load it
    public changeToEndpointUrlSync(endpointUrl: string) {
        this.clearSharpImage();
        this._endpointUrl = endpointUrl;
        this.imageEndpoint = neoImageEndpoint;
    }

    // use this if you fucked up the sharp image and you need a brand new one
    /**
     * Reloads the internally stored image cache to the initial endpoint URL.
     * Use the following method to restore if you had made unwanted changes in the internal image.
     */
    async reloadImage() { await this.changeToEndpointUrl(this._endpointUrl); }

    // extra
    /**
     * Generates multiple image candidates.
     * @param prompt The generation prompt for the images
     * @param numberOfCandidates The amount of image candidates to generate, default is 4
     * @returns Generated a {@link IGeneratedImage} array of generated image canidates if successful.
     */
    async generateImageCandidates(prompt: string, numberOfCandidates: number = 4) {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        if (numberOfCandidates <= 0) throw new Error("Then number of candidates must be positive and above 0");

        const request = await this.client.requester.request("https://plus.character.ai/chat/character/generate-avatar-options", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ prompt, num_candidates: numberOfCandidates, model_version: "v1" }),
            contentType: 'application/json'
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        return response.result as IGeneratedImage[];
    }
    /**
     * Changes the internally stored image cache to a related Character.AI generated image.
     * The first image candidate will be selected. To choose and generate candidates manually, see {@link generateImageCandidates}.
     * @param prompt The generation prompt for the image
     */
    async changeToPrompt(prompt: string) {
        const candidates = await this.generateImageCandidates(prompt, 4);
        this._prompt = prompt;
        
        const url = candidates[0].url;
        await this.changeToEndpointUrl(url, "");
    }

    constructor(client: CharacterAI, canUploadChanges: Function | boolean = true) {
        super();
        this.client = client;
        this.canUploadChanges = 
            typeof canUploadChanges == 'boolean' ? () => canUploadChanges : canUploadChanges;
    }
}