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
    async sendAsync(options: ICAIWebsocketMessage): Promise<string | any> {
        return new Promise(resolve => {
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

                // the way it works is you have an accumulation of packets tied to your request id
                // the returnal will only happen if you wait for turn
                // turns will allow you to know the end for streaming (is final)
                // ws requests are turn based
                const { request_id: requestId, command } = message;
                const { expectedReturnCommand } = options;

                // check for requestId (if specified)
                if (requestId && requestId != options.expectedRequestId) return;

                let isFinal = undefined;
                try {
                    // get turn
                    switch (options.messageType) {
                        case CAIWebsocketConnectionType.DM: turn = message.turn; break;
                        case CAIWebsocketConnectionType.GroupChat: turn = message.push?.data?.turn; break;
                    }
                    
                    if (turn)
                        isFinal = turn.candidates[0].is_final;
                } finally {
                    // if turn is NOT present, push to queue
                    streamedMessage?.push(message);

                    const condition = options.waitForAIResponse ? !turn?.author?.is_human && isFinal : isFinal;
                    
                    // if expectedReturnCommand or condition is met
                    if ((expectedReturnCommand && command == expectedReturnCommand) || condition)
                        disconnectHandlerAndResolve();
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