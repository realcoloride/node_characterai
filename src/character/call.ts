import { exec, spawn } from "child_process";
import { Conversation } from "../chat/conversation";
import CharacterAI, { CheckAndThrow } from "../client";
import Parser from "../parser";
import { EventEmitterSpecable, hiddenProperty } from "../utils/specable";
import Ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Room, RoomEvent, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';

export interface ICharacterCallOptions {
    // will record the input from the default system device
    // other audio inside will not be piped
    useDefaultMicrophoneDevice: boolean,
    // will output the audio onto the default system device
    useDefaultSpeakerDevice: boolean,
    
    voiceId?: string,
    voiceQuery?: string,
    useAutomaticSpeechRecognition: boolean
}

function checkIfFfmpegIsInstalled() {
    return new Promise(resolve => exec('ffmpeg -version', (error, _, __) => resolve(!error)));
}
function checkIfFfplayIsInstalled() {
    return new Promise(resolve => exec('ffplay -version', (error, _, __) => resolve(!error)));
}

// 48000 Hz, 16 bit mono
export class CAICall extends EventEmitterSpecable {    
    @hiddenProperty
    private client: CharacterAI;

    public liveKitRoom?: Room = undefined;
    private audioTrack?: LocalAudioTrack = undefined;
    private inputStream: PassThrough = new PassThrough();
    private outputStream: PassThrough = new PassThrough();

    public inputFfmpeg: FfmpegCommand | any;
    public outputFfmpeg: FfmpegCommand | any;

    private liveKitInputStream: PassThrough = new PassThrough();

    private resetStreams() {
        this.inputStream = new PassThrough();
        this.outputStream = new PassThrough();
        this.liveKitInputStream = new PassThrough();
        
        this.inputFfmpeg = Ffmpeg();
        this.outputFfmpeg = Ffmpeg();
    }

    async connectToSession(options: ICharacterCallOptions, token: string, username: string): Promise<void> {
        this.client.checkAndThrow(CheckAndThrow.RequiresToBeInDM);

        if (!await checkIfFfmpegIsInstalled()) throw Error(
`Ffmpeg is not present on this machine or not detected. Here's a guide to install it:
Ffmpeg is necessary to process the audio for the call.

[INSERT GUIDE SOON]`);

        if (!await checkIfFfplayIsInstalled() && options.useDefaultSpeakerDevice) throw Error(
`Ffplay is not present on this machine or not detected. Here's a guide to install it:
Ffplay is necessary to play out the audio on your speakers without dependencies.

[INSERT GUIDE SOON]`);

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
                enableASR: options.useAutomaticSpeechRecognition,
            }),
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(String(response));

        const { lkUrl, lkToken } = response;
        const liveKitRoom = new Room();

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

                this.resetStreams();
                
                // input
                if (options.useDefaultMicrophoneDevice) {
                    try {
                        switch (process.platform) {
                            case "win32":
                                // use directshow
                                this.inputFfmpeg.input('audio=default').inputFormat('dshow');
                                break;
                            case "darwin":
                                this.inputFfmpeg.input('0').inputFormat('avfoundation');
                                break;
                            case "linux":
                                this.inputFfmpeg.input('default').inputFormat('pulse');
                                break;
                            default: throw new Error();
                        }
                    } catch {
                        reject(new Error("Playing to the default speaker device is unsupported on this device or failed."));
                    }
                } else {
                    // read from stdin aka input stream (this instance)
                    this.inputFfmpeg.input(this.inputStream).inputFormat('pipe:0');
                }

                this.inputFfmpeg
                .audioChannels(1)
                .audioFrequency(48000)
                .audioCodec('pcm_s16le') 
                .format('s16le')
                .pipe(this.liveKitInputStream);

                // god, this is awful. i wish i didn't have to do this.
                this.liveKitInputStream.on('data', async data => {
                    // convert to int16 array & send 
                    const int16Array = new Int16Array(data.buffer, data.byteOffset, data.byteLength / Int16Array.BYTES_PER_ELEMENT);
                    const frame = new AudioFrame(int16Array, 48000, 1, int16Array.length);
                    
                    // final audio frame here
                    await audioSource.captureFrame(frame);
                });
                
                const stream = new AudioStream(track);

                const outputFfmpeg = this.outputFfmpeg as FfmpegCommand;
                outputFfmpeg.input(this.outputStream);

                // start audio processing in different async context
                (async () => {
                    for await (const frame of stream)
                        // send to output ffmpeg
                        this.outputStream.write(frame.data);
                })();

                if (options.useDefaultSpeakerDevice) {
                    // use ffplay
                    const ffplayProcess = spawn('ffplay', [
                        '-f', 's16le',      
                        '-ar', '48000',      
                        '-ac', '1',          
                        '-nodisp',           
                        '-'         
                    ]);

                    this.outputFfmpeg = Ffmpeg()
                        .input(this.outputStream)
                        .inputFormat('s16le')   
                        .audioFrequency(48000)  
                        .audioChannels(1)       
                        .audioCodec('pcm_s16le')
                        .format('s16le')        
                        .pipe(ffplayProcess.stdin);
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