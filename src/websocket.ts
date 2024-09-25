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
    data: any,
    parseJSON: boolean,
    expectedReturnCommand: string,
    messageType: CAIWebsocketConnectionType,
    streaming: boolean,
    expectedRequestId?: string
}
export interface ICAIWebsocketCommand {
    command: string,
    expectedReturnCommand: string,
    originId: 'Android' | 'web-next',
    streaming: boolean
    payload: any,
}

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
            websocket.on('error', (error) => reject(error.message));
            websocket.on('message', async(data) => {
                const message = data.toString('utf-8');
                // console.log("RECEIVED", message);
                
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

                this.emit("rawMessage", message);
            });
        });
    }
    async sendAsync(options: ICAIWebsocketMessage): Promise<string | any> {
        return new Promise((resolve) => {
            let streamedMessage: any[] | undefined = options.streaming ? [] : undefined;
            let turn: any;

            this.on("rawMessage", async function handler(this: CAIWebsocket, message: string | any) {
                if (options.parseJSON)
                    message = await Parser.parseJSON(message, false);
                else {
                    this.off("rawMessage", handler);
                    resolve(message);
                    return;
                }

                const disconnectHandlerAndResolve = () => {
                    this.websocket?.removeListener("rawMessage", handler);
                    resolve(options.streaming ? streamedMessage?.concat(message) : message);
                }

                try {
                    const { request_id, command } = message;
                    if (options.expectedRequestId != request_id || options.expectedReturnCommand != command) return;

                    //if (!options.streaming)  STREAMING MUST BE FIGURED OUT ASAP
                    disconnectHandlerAndResolve();
                } catch {
                    streamedMessage?.push(message);
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