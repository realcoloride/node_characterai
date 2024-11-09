import { exec, spawn } from "child_process";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { EventEmitterSpecable, hiddenProperty } from "../utils/specable";
import { PassThrough } from "stream";
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';
import path from "path";
import { fileURLToPath } from 'url';
import { platform } from "process";

export interface ICharacterCallOptions {
    // will record the input from the default system device or following name
    // nothing means no microphone recording
    microphoneDevice: 'default' | string | false,
    // will output the audio onto the default system device
    // nothing means no speaker playback
    speakerDevice: 'default' | string | false,
    
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
function spawnFF(command: string, ffDebug: boolean) {
    const childProcess = spawn(command, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'] // ignore stdin, pipe stdout, ignore stderr
    });

    childProcess.stderr.on('data', (data) => {
        if (ffDebug) console.error(`ff stderr: ${data.toString()}`);
    });

    // events
    childProcess.on('error', error => console.error(`Error executing command: ${error}`));

    return childProcess;
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
    private inputStream: PassThrough = new PassThrough();
    private outputStream: PassThrough = new PassThrough();

    public micFfmpeg: any;
    public inputFfmpeg: any;
    public outputFfmpeg: any;

    public mute: boolean = false;
    public id = "";
    public roomId = "";

    private latestCandidateId = {};

    public isCharacterSpeaking: boolean = false;

    private liveKitInputStream: PassThrough = new PassThrough();

    private resetStreams() {
        this.inputStream = new PassThrough();
        this.outputStream = new PassThrough();
        this.liveKitInputStream = new PassThrough();
    }

    async connectToSession(options: ICharacterCallOptions, token: string, username: string): Promise<void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);
        console.log("[node_characterai] Call - WARNING: Experimental feature ahead! Report issues in the GitHub.");

        if (!await checkIfFfmpegIsInstalled()) throw Error(
`Ffmpeg is not present on this machine or not detected. Here's a guide to install it:
Ffmpeg is necessary to process the audio for the call.

[INSERT GUIDE SOON]`);

        if (!await checkIfFfplayIsInstalled() && options.speakerDevice) throw Error(
`Ffplay is not present on this machine or not detected. Here's a guide to install it:
Ffplay is necessary to play out the audio on your speakers without dependencies.

[INSERT GUIDE SOON]`);

        console.log("[node_characterai] Call - Creating session...");

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

        const { lkUrl, lkToken, session } = response;
        const liveKitRoom = new Room();

        const { id, roomId } = session;
        this.id = id; this.roomId = roomId;

        console.log("[node_characterai] Call - Connecting to room...");

        this.liveKitRoom = liveKitRoom;
        await liveKitRoom.connect(lkUrl, lkToken, { autoSubscribe: true, dynacast: true });

        liveKitRoom.on('dataReceived', async payload => {
            const decoder = new TextDecoder();
            const data = decoder.decode(payload);

            try {
                const jsonData = JSON.parse(data);
                console.log('livekit message', jsonData);
                const { event } = jsonData;
                
                switch (jsonData) {
                    // when we talk
                    case 'UtteranceCandidate':
                        break;
                    case 'UtteranceFinalized':

                        break;

                    case 'speechStarted':
                        let isSpeechStarted = true;
                    case 'speechEnded':
                        isSpeechStarted = false;

                        const { candidateId } = jsonData;
                        this.latestCandidateId = candidateId;

                        this.isCharacterSpeaking = isSpeechStarted;
                        this.emit(isSpeechStarted ? 'characterSpeechStopped' : 'characterSpeechStarted');
                        break;
                    
                    case 'ParticipantDisconnected':
                        break;
                }
            } catch (error) {
                
            }
            
        });

        return new Promise((resolve, reject) => {
            liveKitRoom.once('trackSubscribed', async track => {
                if (track.kind != TrackKind.KIND_AUDIO) return;

                // 48000 PCM mono data
                const audioSource = new AudioSource(48000, 1);
                const audioTrack = LocalAudioTrack.createAudioTrack('audio', audioSource);
                
                await liveKitRoom.localParticipant?.publishTrack(
                    audioTrack,
                    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
                );

                console.log("[node_characterai] Call - Creating streams...");
                this.resetStreams();

                let { microphoneDevice, speakerDevice } = options;
                const isDefaultMicrophoneDevice = microphoneDevice == 'default';
                const isDefaultSpeakerDevice = speakerDevice == 'default';

                var defaultDevices: any = {};
                if ((isDefaultMicrophoneDevice || isDefaultSpeakerDevice) && platform == 'win32') {
                    defaultDevices = await getDefaultWindowsDevices();

                    const { error } = defaultDevices;
                    if (error)
                        throw new Error("Default devices could not be identified properly. Details: " + error);
                }

                let ffmpegInputCommand = "ffmpeg -f wav -i pipe:0 -ac 1 -ar 48000 -f s16le pipe:1";

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

                        ffmpegInputCommand = `ffmpeg -f ${inputFormat} -rtbufsize 256M -i ${microphoneDevice} -f lavfi -i anullsrc=r=48000:cl=mono -ar 48000 -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" -ac 1 -ar 48000 -f s16le pipe:1`;
                    } catch (error) {
                        reject(new Error("Recording from the default microphone device is unsupported on this device or failed. Details: " + error));
                    }
                } 
                
                console.log("[node_characterai] Call - Creating input source");

                // input mic/arbitrary data -> pipe:0 -> output pipe:1 pcm data in stdout
                // console.log(ffmpegInputCommand);

                const inputFfmpeg = spawnFF(ffmpegInputCommand, true);
                inputFfmpeg.on('exit', (code, signal) => { throw new Error("FFplay crashed"); });
                inputFfmpeg.stdin.pipe(this.inputStream);
                inputFfmpeg.stdout.pipe(this.liveKitInputStream);
                this.inputFfmpeg = inputFfmpeg;

                // god, this is awful. i wish i didn't have to do this.
                this.liveKitInputStream.on('data', async data => {
                    if (this.mute) return;
                    // convert to int16 array & send 
                    const int16Array = new Int16Array(data.buffer, data.byteOffset, data.byteLength / Int16Array.BYTES_PER_ELEMENT);
                    const frame = new AudioFrame(int16Array, 48000, 1, int16Array.length);
                    
                    // final audio frame here
                    await audioSource.captureFrame(frame);
                });
                
                //this.onpu.on('data', data => console.log(data));
                this.inputStream.on('data', data => console.log(data));
                //this.outputStream.on('data', data => console.log(data));
                console.log("[node_characterai] Call - Creating output source");
                if (speakerDevice) {
                    // todo store this and do speaker device

                    //`ffplay -f s16le -ar 48000 -nodisp -audio_device "${speakerDevice}" -`
                    // use ffplay
                    const ffplayProcess = spawnFF(`ffplay -f s16le -ar 48000 -nodisp -`, false);
                    // ffplayProcess.on('error', error => console.log("ffplay close", error))
                    ffplayProcess.on('exit', (code, signal) => { throw new Error("FFplay crashed"); });

                    this.outputStream.pipe(ffplayProcess.stdin);
                }

                const stream = new AudioStream(track);

                // start audio processing in different async context
                (async () => {
                    for await (const frame of stream)
                        // send to output ffmpeg
                        this.outputStream.write(frame.data);
                })();

                console.log("[node_characterai] Call - Call is ready.");
                resolve();
            });
        });
    }

    // https://neo.character.ai/multimodal/api/v1/sessions/discardCandidate
    async interrupt(candidateId?: string) {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);

        // TODO

        const conversation = this.client.currentConversation;
        if (!conversation) throw new Error("No conversation");
        const character = await conversation.getCharacter();

        const request = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/sessions/discardCandidate", {
            method: 'POST',
            contentType: 'application/json',
            body: Parser.stringify({ candidateId: null, characterId: character.characterId, roomId: this.roomId }),
            includeAuthorization: true
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error();
        
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