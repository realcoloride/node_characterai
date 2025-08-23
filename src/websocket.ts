import { EventEmitter } from "stream";
import { WebSocket } from "ws";
import Parser from "./parser";

export enum CAIWebsocketConnectionType {
    Disconnected = 0,
    DM = 1,
    GroupChat = 2
}

export interface ICAIWebsocketCreation {
    url: string,
    edgeRollout: string,
    authorization: string,
    userId: number
}

export interface ICAIWebsocketMessage {
    data: string,
    parseJSON: boolean,
    expectedReturnCommand?: string,
    messageType: CAIWebsocketConnectionType,
    waitForAIResponse: boolean,
    streaming: boolean, // streams give an output of an array instead of the message straight up
    expectedRequestId?: string
}
export interface ICAIWebsocketCommand {
    command: string,
    expectedReturnCommand?: string,
    originId: 'Android' | 'web-next',
    waitForAIResponse?: boolean,
    streaming: boolean,
    payload: unknown,
}

export interface CAIStreamEvent {
    requestId: string;
    isFinal: boolean;
    text?: string;
    deltaText?: string;
}

type Candidate = { raw_content?: string; is_final?: boolean };
type Author = { is_human?: boolean };
export type Turn = { candidates?: Candidate[]; author?: Author };
type WSMessage = {
    request_id?: string;
    command?: string;
    turn?: Turn;
    push?: { data?: { turn?: Turn } };
};

export class CAIWebsocket extends EventEmitter {
    private address = "";
    private cookie = "";
    private userId = 0;
    private websocket?: WebSocket = undefined;

    async open(withCheck: boolean): Promise<CAIWebsocket> {
        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(this.address, { headers: { Cookie: this.cookie } });
            this.websocket = websocket;

            websocket.once('open', () => {
                if (!withCheck) {
                    this.emit("connected");
                    resolve(this);
                    return;
                }

                const payload = 
                    Parser.stringify({ connect: { name: 'js'}, id: 1 }) +
                    Parser.stringify({ subscribe: { channel: `user#${this.userId}` }, id: 1 });
                websocket.send(payload);
            })
            websocket.on('close', (code: number, reason: Buffer) => reject(`Websocket connection failed (${code}): ${reason}`));
            websocket.on('error', error => reject(error.message));
            websocket.on('message', async data => {
                const message = data.toString('utf-8');
                
                if (withCheck) {
                    const potentialObject = await Parser.parseJSON(message, false);
                    const connectInformation = potentialObject.connect;
                    if (connectInformation && connectInformation?.pong == true) {
                        this.emit("connected");
                        resolve(this);
                        return;
                    }
                }

                // keep alive packet
                if (message == "{}") {
                    websocket.send("{}");
                    return;
                }

                // console.log("RECEIVED", message);
                this.emit("rawMessage", message);
            });
        });
    }
    async sendAsync(options: ICAIWebsocketMessage): Promise<string | unknown> {
        return new Promise(resolve => {
            let lastText = "";
            this.on("rawMessage", async function handler(this: CAIWebsocket, incoming: string | WSMessage) {
                const parsed: WSMessage = options.parseJSON ? await Parser.parseJSON(incoming as string, false) : (incoming as WSMessage);
                if (!options.parseJSON) {
                    this.off("rawMessage", handler);
                    resolve(incoming as string);
                    return;
                }

                const { request_id: requestId, command } = parsed;
                const { expectedReturnCommand } = options;
                if (requestId && options.expectedRequestId && requestId !== options.expectedRequestId) {
                    return;
                }

                let turn: Turn | undefined;
                if (options.messageType === CAIWebsocketConnectionType.DM) {
                    turn = parsed.turn;
                } else if (options.messageType === CAIWebsocketConnectionType.GroupChat) {
                    turn = parsed.push?.data?.turn;
                }

                const text = turn?.candidates?.[0]?.raw_content;
                const isFinal = !!turn?.candidates?.[0]?.is_final;
                let delta: string | undefined = undefined;
                if (typeof text === "string") {
                    if (text.startsWith(lastText)) {
                        delta = text.slice(lastText.length);
                    }
                    lastText = text;
                }

                if (options.streaming) {
                    const evt: CAIStreamEvent = {
                        requestId: options.expectedRequestId ?? "",
                        isFinal,
                        text,
                        deltaText: delta
                    };
                    this.emit(isFinal ? "stream:final" : "stream:delta", evt);
                }

                const condition = options.waitForAIResponse
                    ? !turn?.author?.is_human && isFinal
                    : isFinal;

                if ((expectedReturnCommand && command == expectedReturnCommand) || condition) {
                    this.websocket?.removeListener("rawMessage", handler);
                    resolve(parsed);
                }
            });

            this.websocket?.send(options.data);
        })
    }
    close() {
        this.removeAllListeners();
        this.websocket?.removeAllListeners();
        this.websocket?.close();
    }

    constructor(options: ICAIWebsocketCreation) {
        super();
        this.address = options.url;
        this.cookie = `HTTP_AUTHORIZATION="Token ${options.authorization}"; edge_rollout=${options.edgeRollout};`;
        this.userId = options.userId;
    }
}
