import { exec, spawn } from "child_process";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { EventEmitterSpecable, hiddenProperty } from "../utils/specable";
import Ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';
import path from "path";
import { fileURLToPath } from 'url';
import { platform } from "process";

export interface ICharacterCallOptions {
    // will record the input from the default system device or following name
    // nothing means no microphone recording
    microphoneDevice?: 'default' | string,
    // will output the audio onto the default system device
    // nothing means no speaker playback
    speakerDevice?: 'default' | string,
    
    voiceId?: string,
    voiceQuery?: string,
    useAutomaticSpeechRecognition?: boolean
}

function checkIfFfmpegIsInstalled() {
    return new Promise(resolve => exec('ffmpeg -version', error => resolve(!error)));
}
function checkIfFfplayIsInstalled() {
    return new Promise(resolve => exec('ffplay -version', error => resolve(!error)));
}

function getLibraryRoot(): string {
    return path.dirname(fileURLToPath(new URL(import.meta.url)));
}
function getDefaultWindowsDevices(): any {
    const scriptPath = path.join(getLibraryRoot(), 'getDefaultMicrophone.ps1');

    return new Promise(resolve => exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) return resolve({ error });
        if (stderr) return resolve({ error: stderr });

        const deviceJson = stdout.trim();
        resolve(JSON.parse(deviceJson));
    }))
}

const platformInputFormats: any = {
    win32: 'dshow',
    darwin: 'avfoundation',
    linux: 'pulse'
};
const platformDefaultInputFormats: any = {
    win32: 'audio="default"',
    darwin: '0',
    linux: 'default'
};

// 48000 Hz, 16 bit mono
export class CAICall extends EventEmitterSpecable {    
    @hiddenProperty
    private client: CharacterAI;

    public liveKitRoom?: Room = undefined;
    private audioTrack?: LocalAudioTrack = undefined;
    private inputStream: PassThrough = new PassThrough();
    private outputStream: PassThrough = new PassThrough();

    public micFfmpeg: FfmpegCommand | any;
    public inputFfmpeg: FfmpegCommand | any;
    public outputFfmpeg: FfmpegCommand | any;

    private liveKitInputStream: PassThrough = new PassThrough();

    private resetStreams() {
        this.inputStream = new PassThrough();
        this.outputStream = new PassThrough();
        this.liveKitInputStream = new PassThrough();
    }

    async connectToSession(options: ICharacterCallOptions, token: string, username: string): Promise<void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);

        console.log("[node_characterai] Call - Creating session...");
        if (!await checkIfFfmpegIsInstalled()) throw Error(
`Ffmpeg is not present on this machine or not detected. Here's a guide to install it:
Ffmpeg is necessary to process the audio for the call.

[INSERT GUIDE SOON]`);

        if (!await checkIfFfplayIsInstalled() && options.speakerDevice) throw Error(
`Ffplay is not present on this machine or not detected. Here's a guide to install it:
Ffplay is necessary to play out the audio on your speakers without dependencies.

[INSERT GUIDE SOON]`);

        console.log("[node_characterai] Call - WARNING: Experimental feature ahead! Report issues in the GitHub.");

        const conversation = this.client.currentConversation;
        if (!conversation) throw Error("No conversation");
        const character = await conversation.getCharacter();

        let voiceQuery = options.voiceQuery ?? character.displayName;
        if (options.voiceId && options.voiceQuery) throw Error("You can either use a specific voiceId or a query. By default, no queries or voiceId will result in query to be auto set to the character's name.");
        !options.voiceId && !options.voiceQuery
        
        const request = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/sessions/joinOrCreateSession", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                roomId: this.client.currentConversation?.chatId,
                ...(options.voiceId 
                    ? { voices: { [character.characterId]: options.voiceId } } 
                    : { voiceQueries: { [character.characterId]: voiceQuery } }),
                rtcBackend: "lk",
                userAuthToken: token,
                username,
                enableASR: options.useAutomaticSpeechRecognition ?? true,
            }),
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        const { lkUrl, lkToken } = response;
        const liveKitRoom = new Room();

        console.log("[node_characterai] Call - Connecting to room...");

        this.liveKitRoom = liveKitRoom;
        await liveKitRoom.connect(lkUrl, lkToken, { autoSubscribe: true, dynacast: true });

        return new Promise((resolve, reject) => {
            liveKitRoom.once('trackSubscribed', async track => {
                if (track.kind != TrackKind.KIND_AUDIO) return;

                // 48000 PCM mono data
                const audioSource = new AudioSource(48000, 1);
                const audioTrack = LocalAudioTrack.createAudioTrack('audio', audioSource);
                this.audioTrack = audioTrack;
                
                await liveKitRoom.localParticipant?.publishTrack(
                    audioTrack,
                    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
                );

                console.log("[node_characterai] Call - Creating streams...");
                this.resetStreams();
                console.log("Connected to livekit");

                let { microphoneDevice, speakerDevice } = options;
                const isDefaultMicrophoneDevice = microphoneDevice == 'default';
                const isDefaultSpeakerDevice = speakerDevice == 'default';

                var defaultDevices: any = {};
                if ((isDefaultMicrophoneDevice || isDefaultSpeakerDevice) && platform == 'win32') {
                    console.log("fetching default devcs");
                    defaultDevices = await getDefaultWindowsDevices();
                    console.log(defaultDevices);

                    const { error } = defaultDevices;
                    if (error)
                        throw new Error("Default devices could not be identified properly. Details: " + error);
                }

                // input mic/arbitrary data -> pipe:0 -> output pipe:1 pcm data in stdout
                this.inputFfmpeg = Ffmpeg()
                    .input('pipe:0')
                    .outputOptions([
                        '-ac 1',                      // Mono audio channel
                        '-ar 48000',                  // 48kHz sample rate
                        '-f s16le',                   // Raw PCM output in s16le format
                        '-acodec pcm_s16le'           // Set audio codec to PCM s16le explicitly
                    ])
                    .output('pipe:1')               // Direct ffmpeg output to pipe:1
                    .pipe(this.liveKitInputStream, { end: false });   

                // input
                if (microphoneDevice) {
                    const inputFormat = platformInputFormats[process.platform] as string;

                    if (isDefaultMicrophoneDevice && platform == 'win32')
                        microphoneDevice = defaultDevices.microphone;

                    // this requires in-depth testing for other than windows..
                    microphoneDevice = `audio="${microphoneDevice}"`;

                    try {
                        console.log('input format:', inputFormat);
                        console.log('input device:', microphoneDevice);
                        this.micFfmpeg = Ffmpeg() //`-f ${inputFormat} -i ${microphoneDevice}`)
                            .input(microphoneDevice)
                            .inputFormat(inputFormat)
                            .outputOptions(['-f s16le'])
                            .pipe(this.inputFfmpeg.stdin);
                    } catch (error) {
                        reject(new Error("Recording from the default microphone device is unsupported on this device or failed. Details: " + error));
                    }
                } 
                console.log("created input");

                // god, this is awful. i wish i didn't have to do this.
                this.liveKitInputStream.on('data', async data => {
                    // convert to int16 array & send 
                    const int16Array = new Int16Array(data.buffer, data.byteOffset, data.byteLength / Int16Array.BYTES_PER_ELEMENT);
                    const frame = new AudioFrame(int16Array, 48000, 1, int16Array.length);
                    
                    // final audio frame here
                    await audioSource.captureFrame(frame);
                });
                
                const stream = new AudioStream(track);

                const outputFfmpeg = Ffmpeg()
                    .input(this.outputStream)
                    .inputFormat('s16le')
                    .audioFrequency(48000)  
                    .audioChannels(1)       
                    .audioCodec('pcm_s16le')
                    .format('s16le');

                // start audio processing in different async context
                (async () => {
                    for await (const frame of stream)
                        // send to output ffmpeg
                        this.outputStream.write(frame.data);
                })();

                if (options.speakerDevice) {
                    // use ffplay
                    const ffplayProcess = spawn('ffplay', [
                        '-f', 's16le',    
                        '-ar', '48000', 
                        '-ac', '1', 
                        '-nodisp', 
                        '-' 
                    ]);

                    outputFfmpeg.pipe(ffplayProcess.stdin);
                }

                resolve();
            });
        });
    }

    async hangUp() {

    }
    public clean() {
        this.inputStream.destroy();
        this.liveKitInputStream.destroy();

        this.inputFfmpeg?.kill("");
        this.outputFfmpeg?.kill("");
    }

    constructor(client: CharacterAI, ) {
        super();
        this.client = client;
    }
}