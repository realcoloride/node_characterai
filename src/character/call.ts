import { exec, spawn } from "child_process";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { EventEmitterSpecable, hiddenProperty } from "../utils/specable";
import internal, { PassThrough } from "stream";
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';
import path from "path";
import { fileURLToPath } from 'url';
import { platform } from "process";
import { DisconnectReason } from "@livekit/rtc-node/dist/proto/room_pb";

export interface ICharacterCallOptions {
    // will record the input from the default system device or following name
    // nothing means no microphone recording
    microphoneDevice: 'default' | string | false,
    // will output the audio onto the default system device
    // nothing means no speaker playback
    useSpeakerForPlayback: boolean,
    
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

    private liveKitRoom?: Room = undefined;
    private inputStream: PassThrough = new PassThrough();
    private outputStream: PassThrough = new PassThrough();

    private inputFfmpeg: any;
    private outputFfmpeg: any;
    private outputFfplay: any;

    public mute: boolean = false;
    public id = "";
    public roomId = "";
    private latestCandidateId: string | null = null;

    public isCharacterSpeaking: boolean = false;
    private liveKitInputStream: PassThrough = new PassThrough();

    private hasBeenShutDownNormally: boolean = false;

    private resetStreams() {
        this.inputStream = new PassThrough();
        this.outputStream = new PassThrough();
        this.liveKitInputStream = new PassThrough();
    }

    private callForBackgroundConversationRefresh() {
        (async() => await this.client.currentConversation?.refreshMessages())();
    }

    async connectToSession(options: ICharacterCallOptions, token: string, username: string): Promise<void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);
        if (this.liveKitRoom) throw new Error("You are already connected to a call.");
        
        this.hasBeenShutDownNormally = false;

        console.log("[node_characterai] Call - WARNING: Experimental feature ahead! Report issues in the GitHub.");

        if (!await checkIfFfmpegIsInstalled()) throw Error(
`Ffmpeg is not present on this machine or not detected. Here's a guide to install it:
Ffmpeg is necessary to process the audio for the call.

[INSERT GUIDE SOON]`);

        if (!await checkIfFfplayIsInstalled() && options.useSpeakerForPlayback) throw Error(
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
            
            const jsonData = JSON.parse(data);
            const { event } = jsonData;
            
            switch (event) {
                // when we talk
                case 'UtteranceCandidate':
                    let isUtteranceCandidateFinal = false;
                case 'UtteranceFinalized':
                    isUtteranceCandidateFinal = true;
                    const { text, timestamp, userStopSpeakingTime, ted_confidence: tedConfidence, interruption_confidence: interruptionConfidence} = jsonData;

                    this.emit('userSpeechCandidate', {
                        text, timestamp, userStopSpeakingTime, tedConfidence, interruptionConfidence,
                        isUtteranceCandidateFinal
                    });
                    break;

                case 'speechStarted':
                    let isSpeechStarted = true;
                case 'speechEnded':
                    isSpeechStarted = false;

                    const { candidateId } = jsonData;
                    this.latestCandidateId = candidateId;

                    this.isCharacterSpeaking = isSpeechStarted;
                    this.emit(isSpeechStarted ? 'characterBeganSpeaking' : 'characterEndedSpeaking');

                    // call for message refresh when that happens in a separate context
                    if (!isSpeechStarted) this.callForBackgroundConversationRefresh();
                    break;
                
                // other events:
                // 'ParticipantDisconnected'
                // 'TurnState'
            }
        });
        liveKitRoom.on('disconnected', async (disconnectReason: DisconnectReason) => await this.internalHangup(disconnectReason.toString()));

        return new Promise((resolve, reject) => {
            liveKitRoom.once('trackSubscribed', async track => {
                if (track.kind != TrackKind.KIND_AUDIO) return;
                
                const cleanReject = (reason: any) => {
                    this.clean();
                    reject(reason);
                };

                // 48000 PCM mono data
                const audioSource = new AudioSource(48000, 1);
                const audioTrack = LocalAudioTrack.createAudioTrack('audio', audioSource);
                
                await liveKitRoom.localParticipant?.publishTrack(
                    audioTrack,
                    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
                );

                console.log("[node_characterai] Call - Creating streams...");
                this.resetStreams();

                let { microphoneDevice, useSpeakerForPlayback } = options;
                const isDefaultMicrophoneDevice = microphoneDevice == 'default';

                var defaultDevices: any = {};
                if ((isDefaultMicrophoneDevice) && platform == 'win32') {
                    defaultDevices = await getDefaultWindowsDevices();

                    const { error } = defaultDevices;
                    if (error)
                        cleanReject(new Error("Default devices could not be identified properly. Details: " + error));
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
                        ffmpegInputCommand = `ffmpeg -f ${inputFormat} -rtbufsize 256M -i ${microphoneDevice} -f lavfi -i anullsrc=r=48000:cl=mono -ar 48000 -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" -ac 1 -ar 48000 -f s16le pipe:1`;
                    } catch (error) {
                        this.clean();
                        cleanReject(new Error("Recording from the default microphone device is unsupported on this device or failed. Details: " + error));
                    }
                } 
                
                // input mic/arbitrary data -> pipe:0 -> output pipe:1 pcm data in stdout
                // console.log(ffmpegInputCommand);

                const inputFfmpeg = spawnFF(ffmpegInputCommand, false);
                inputFfmpeg.on('exit', async (code, signal) => await this.internalHangup(`Ffmpeg exited (code ${code}) with signal ${signal}`));
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
                
                if (useSpeakerForPlayback) {
                    // use ffplay
                    const outputFfplay = spawnFF(`ffplay -f s16le -ar 48000 -nodisp -`, false);
                    outputFfplay.on('exit', async (code, signal) => await this.internalHangup(`Ffplay exited (code ${code}) with signal ${signal}`));
                    this.outputFfplay = outputFfplay;

                    this.outputStream.pipe(outputFfplay.stdin);
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
    async interruptCharacter() {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);

        if (this.latestCandidateId == null) return;

        const conversation = this.client.currentConversation;
        if (!conversation) throw new Error("No conversation");

        const request = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/sessions/discardCandidate", {
            method: 'POST',
            contentType: 'application/json',
            body: Parser.stringify({ candidateId: this.latestCandidateId, characterId: conversation.characterId, roomId: this.roomId }),
            includeAuthorization: true
        });
        if (!request.ok) throw new Error("Could not interrupt character talking");

        this.latestCandidateId = null;
        this.callForBackgroundConversationRefresh();
    }

    private async internalHangup(errorReason?: string) {
        if (this.hasBeenShutDownNormally) return;

        this.client.currentCall = undefined;
        await this.liveKitRoom?.disconnect();
        this.clean();

        console.log("[node_characterai] Call - Call hung up.");

        if (errorReason) throw new Error(`Call error: ${errorReason}`);
    }
    async hangUp() {  await this.internalHangup(); }

    private clean() {
        this.hasBeenShutDownNormally = true;

        this.inputStream?.destroy();
        this.outputStream?.destroy();
        this.liveKitInputStream?.destroy();

        this.inputFfmpeg?.kill();
        this.outputFfmpeg?.kill();
        this.outputFfplay?.kill();
        
        delete this.liveKitRoom;
    }

    constructor(client: CharacterAI) {
        super();
        this.client = client;
    }
}