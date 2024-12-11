import { CharacterAI, CheckAndThrow } from "../client";
import Parser from "../parser";
import { EventEmitterSpecable, hiddenProperty } from "../utils/specable";
import { PassThrough } from "stream";
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, RemoteTrack, Room, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';
import path from "path";
import { DisconnectReason } from "@livekit/rtc-node/dist/proto/room_pb";
import DMConversation from "../chat/dmConversation";
import fs from 'fs';
import AudioInterface from "./audioInterface";
import { exec, spawn } from "child_process";
import { AudioIO, IoStreamRead, IoStreamWrite, SampleFormat16Bit } from "naudiodon";
import Warnings from "../warnings";

type DeviceType = 'default' | string | number | false;

export interface ICharacterCallOptions {
    // will record the input from the default system device or following name
    // nothing means no microphone recording
    /**
     * **Specifies a microphone device/input to use.**
     * 
     * You can use `'default'` to specify the default system input device
     * or a `'Device Name'` or the microphone's `id`.
     * 
     * Set to `false` to send arbitrary PCM data through the input stream.
     * **Using arbitrary PCM data will go through ffmpeg.**
     * If you wish to play files, use the `playFile()` method instead.
     */
    microphoneDevice: DeviceType,
    // will output the audio onto the default system device
    speakerDevice: DeviceType,
    
    voiceId?: string,
    voiceQuery?: string
}

let isSoxAvailable: boolean | null = null;

function checkIfSoxIsInstalled(): Promise<boolean> {
    return new Promise(resolve => exec('sox --version', error => resolve(!error)));
}

function getDeviceId(type: 'microphone' | 'speaker', device: 'default' | string | number | false) {
    if (device == 'default' || device == undefined)
        return -1;

    let method;
    switch (typeof device) {
        case 'number': 
            method = type == 'microphone' ? AudioInterface.getMicrophoneFromId : AudioInterface.getSpeakerFromId;
            return method(device)?.id ?? Error(`Cannot find ${type} device with the id ${device}`);
        case 'string': 
            method = type == 'microphone' ? AudioInterface.getMicrophoneFromName : AudioInterface.getSpeakerFromName;
            return method(device)?.id ?? Error(`Cannot find ${type} device with the name ${device}`);
    }

    return -1;
}

function spawnProcessTool(command: string, ffDebug: boolean) {
    const childProcess = spawn(command, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    if (ffDebug)
        childProcess.stderr.on('data', data => console.error(`ff stderr: ${data.toString()}`));

    // events
    if (ffDebug)
        childProcess.on('error', error => console.error(`Error executing command: ${error}`));

    return childProcess;
}

export class CAICall extends EventEmitterSpecable {    
    @hiddenProperty
    private client: CharacterAI;

    @hiddenProperty
    private conversation: DMConversation;

    private liveKitRoom?: Room = undefined;
    public inputStream: PassThrough = new PassThrough();
    public outputStream: PassThrough = new PassThrough();

    private inputMicrophoneIO: IoStreamRead | null = null;
    private speakerOutputIO: IoStreamWrite | null = null;

    public mute: boolean = false;
    public id = "";
    public roomId = "";
    private latestCandidateId: string | null = null;

    public isCharacterSpeaking: boolean = false;
    private liveKitInputStream: PassThrough = new PassThrough();

    private dataProcessCallback: any;

    private hasBeenShutDownNormally: boolean = false;
    public ready: boolean = false;

    private resetStreams() {
        this.inputStream = new PassThrough();
        this.outputStream = new PassThrough();
        this.liveKitInputStream = new PassThrough();
    }

    private callForBackgroundConversationRefresh() {
        (async() => await this.conversation?.refreshMessages())();
    }

    async connectToSession(options: ICharacterCallOptions, token: string, username: string): Promise<void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        if (this.client.currentCall != this) throw new Error("You are connected into another call that isn't this one. Please disconnect from that one first because CharacterAI restricts to only 1 call per person.");
        if (this.liveKitRoom) throw new Error("You are already connected to this call.");
        
        this.ready = false;
        this.hasBeenShutDownNormally = false;

        console.log("[node_characterai] Call - WARNING: Experimental feature ahead! Report issues in the GitHub.");

        if (isSoxAvailable == null) 
            isSoxAvailable = await checkIfSoxIsInstalled();

        console.log("[node_characterai] Call - Creating session...");

        const { conversation } = this;
        if (!conversation) throw Error("No conversation");
        const character = await conversation.getCharacter();

        let voiceQuery = options.voiceQuery ?? character.displayName;
        if (options.voiceId && options.voiceQuery) throw Error("You can either use a specific voiceId or a query. By default, no queries or voiceId will result in query to be auto set to the character's name.");
        !options.voiceId && !options.voiceQuery
        
        const request = await this.client.requester.request("https://neo.character.ai/multimodal/api/v1/sessions/joinOrCreateSession", {
            method: 'POST',
            includeAuthorization: true,
            body: Parser.stringify({ 
                roomId: conversation?.chatId,
                ...(options.voiceId 
                    ? { voices: { [character.characterId]: options.voiceId } } 
                    : { voiceQueries: { [character.characterId]: voiceQuery } }),
                rtcBackend: "lk",
                platform: "web",
                userAuthToken: token,
                username,
                enableASR: true
            }),
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        const { lkUrl, lkToken, session } = response;
        const liveKitRoom = new Room();
        await liveKitRoom.connect(lkUrl, lkToken, { autoSubscribe: true, dynacast: true });

        const { id, roomId } = session;
        this.id = id; this.roomId = roomId;

        console.log("[node_characterai] Call - Connecting to room...");

        this.liveKitRoom = liveKitRoom;
        liveKitRoom.on('dataReceived', async (payload: any) => {
            const decoder = new TextDecoder();
            const data = decoder.decode(payload);
            
            const jsonData = JSON.parse(data);
            const { event } = jsonData;
            let isUtteranceCandidateFinal = true;
            let isSpeechStarted = false;

            // console.log(jsonData);
            switch (event) {
                // when we talk
                case 'UtteranceCandidate': isUtteranceCandidateFinal = false;
                case 'UtteranceFinalized':
                    isUtteranceCandidateFinal = true;
                    const { text, timestamp, userStopSpeakingTime, ted_confidence: tedConfidence, interruption_confidence: interruptionConfidence} = jsonData;

                    this.emit(isUtteranceCandidateFinal ? 'userSpeechProgress' : 'userSpeechEnded', {
                        text, timestamp, userStopSpeakingTime, tedConfidence, interruptionConfidence
                    });
                    break;

                case 'speechStarted': isSpeechStarted = true;
                case 'speechEnded':
                    const { candidateId } = jsonData;
                    this.latestCandidateId = candidateId;

                    this.isCharacterSpeaking = isSpeechStarted;
                    this.emit(isSpeechStarted ? 'characterBeganSpeaking' : 'characterEndedSpeaking');

                    // call for message refresh when that happens in a separate context
                    if (!isSpeechStarted) this.callForBackgroundConversationRefresh();
                    break;
                case 'ParticipantDisconnected':
                    await this.internalHangup("Participant disconnected");
                    break;
                case 'WaitingForASRUserTrackAcquisition':

                    break;

                // other events:
                // 'ParticipantDisconnected'
                // 'TurnState'
                // 'WaitingForASRUserTrackAcquisition'
            }
        });
        liveKitRoom.on('disconnected', async (disconnectReason: DisconnectReason) => await this.internalHangup(disconnectReason.toString()));

        return new Promise(resolve => {
            liveKitRoom.once('trackSubscribed', async (track: RemoteTrack) => {
                if (track.kind != TrackKind.KIND_VIDEO &&
                    track.kind != TrackKind.KIND_AUDIO) return;

                // 48000 PCM mono data
                const audioSource = new AudioSource(48000, 1);
                const audioTrack = LocalAudioTrack.createAudioTrack('audio', audioSource);
                
                if (!liveKitRoom.localParticipant) {
                    await this.internalHangup("Could not find local participant");
                    return;
                }

                await liveKitRoom.localParticipant.publishTrack(
                    audioTrack,
                    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
                );

                console.log("[node_characterai] Call - Creating streams...");
                this.resetStreams();

                const { microphoneDevice, speakerDevice } = options;

                let microphoneId: number | undefined = undefined;
                let speakerId: number | undefined = undefined;

                // input
                if (microphoneDevice)
                    microphoneId = getDeviceId('microphone', microphoneDevice) as number;
                // output
                if (speakerDevice)
                    speakerId = getDeviceId('speaker', speakerDevice) as number;

                // input mic/arbitrary data -> pipe:0 -> output pipe:1 pcm data in stdout

                // god, this is awful. i wish i didn't have to do this.
                this.dataProcessCallback = async (data: any) => {
                    if (this.mute || !data || data.length === 0) return;
                    
                    // convert to int16 array & send 
                    const int16Array = new Int16Array(data.buffer, data.byteOffset, data.byteLength / Int16Array.BYTES_PER_ELEMENT);
                    if (int16Array.length === 0) return;
                    
                    const frame = new AudioFrame(int16Array, 48000, 1, int16Array.length);
                    // final audio frame here
                    await audioSource.captureFrame(frame);
                };

                this.liveKitInputStream.on('data', this.dataProcessCallback);
                
                if (microphoneId) {
                    const microphoneIO = AudioIO({ 
                        inOptions: { 
                            channelCount: 1,
                            sampleFormat: SampleFormat16Bit,
                            sampleRate: 48000,
                            deviceId: microphoneId,
                            closeOnError: true,
                        } 
                    });

                    this.inputMicrophoneIO = microphoneIO;
                    microphoneIO.pipe(this.liveKitInputStream);
                    microphoneIO.start();
                }
                if (speakerId) {
                    const speakerIO = AudioIO({ 
                        outOptions: { 
                            channelCount: 1,
                            sampleFormat: SampleFormat16Bit,
                            sampleRate: 48000,
                            deviceId: speakerId,
                            closeOnError: true
                        }
                    });
                    
                    this.speakerOutputIO = speakerIO;
                    this.outputStream.pipe(speakerIO);
                    speakerIO.start();
                }

                // start audio processing in different async context
                const stream = new AudioStream(track);
                (async () => {
                    for await (const frame of stream)
                        // send to output ffmpeg
                        this.outputStream.write(frame.data);
                })();

                // this.outputStream.on('data', data => console.log(data));
                this.ready = true;
                console.log("[node_characterai] Call - Call is ready!");

                resolve();
            });
        });
    }

    async playFile(filePath: fs.PathLike): Promise<void> {
        if (!this.ready) throw new Error("Call is not ready yet.");

        const resolvedPath = path.resolve(filePath.toString());
        if (!fs.existsSync(resolvedPath)) throw new Error("Path is invalid");

        if (!isSoxAvailable) {
            Warnings.show('soxNotFound');
            return;
        }

        return new Promise(resolve => {
            spawnProcessTool(`${AudioInterface.soxPath ?? 'sox'} "${filePath}" -r 48000 -c 1 -b 16 -L -t raw -`, false)
                .stdout.pipe(this.liveKitInputStream);
            resolve();
        });
    }

    public get canInterruptCharacter() { return this.latestCandidateId != null; }

    // https://neo.character.ai/multimodal/api/v1/sessions/discardCandidate
    async interruptCharacter() {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInCall);

        if (!this.canInterruptCharacter) return;

        const { conversation } = this;
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
    async hangUp() { await this.internalHangup(); }

    private clean() {
        this.hasBeenShutDownNormally = true;

        this.liveKitInputStream?.off('data', this.dataProcessCallback);

        this.inputStream?.end();
        this.outputStream?.end();
        this.liveKitInputStream?.end();

        this.inputMicrophoneIO?.quit?.();
        this.speakerOutputIO?.quit?.();

        this.inputMicrophoneIO = null;
        this.speakerOutputIO = null;
        
        delete this.liveKitRoom;
    }

    constructor(client: CharacterAI, conversation: DMConversation) {
        super();
        this.client = client;
        this.conversation = conversation;
    }
}