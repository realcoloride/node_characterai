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
    userId?: number
}

export interface ICAIWebsocketMessage {
    data: any,
    parseJSON: boolean,
    awaitResponse: boolean,
    messageType: CAIWebsocketConnectionType,
    streaming: boolean
}

export class CAIWebsocket extends EventEmitter {
    private address = "";
    private cookie = "";
    private userId? = 0;
    private websocket?: WebSocket = undefined;

    async open(): Promise<CAIWebsocket> {
        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(this.address, { headers: { Cookie: this.cookie } });
            this.websocket = websocket;

            websocket.once('open', () => {
                if (this.userId) {
                    const payload = 
                        Parser.stringify({ connect: { name: 'js'}, id: 1 }) +
                        Parser.stringify({ subscribe: { channel: `user#${this.userId}` }, id: 1 });
                    websocket.send(payload);
                    this.emit("connected");
                }
                resolve(this);
            })
            websocket.on('message', (data) => {
                const message = data.toString('utf-8');

                if (message == "{}") websocket.send("{}");
                else this.emit("rawMessage", message)
            });
        });
    }
    async sendAsync(options: ICAIWebsocketMessage): Promise<string | any> {
        return new Promise((resolve) => {
            let streamedMessage: any[] | undefined = options.streaming ? [] : undefined;
            let turn: any;

            this.on("rawMessage", function handler(this: CAIWebsocket, message: string | any) {
                if (options.parseJSON) message = Parser.parseJSON(message);

                if (!options.parseJSON || !options.messageType) {
                    this.off("rawMessage", handler);
                    resolve(message);
                    return;
                }

                const disconnectHandlerAndResolve = () => {
                    this.websocket?.removeListener("rawMessage", handler);
                    resolve(options.streaming ? streamedMessage?.concat(message) : message);
                }

                try {
                    switch (options.messageType) {
                        case CAIWebsocketConnectionType.DM: turn = message.turn; break;
                        case CAIWebsocketConnectionType.GroupChat: turn = message.push?.data?.turn; break;
                    }

                    if (options.awaitResponse && // combine
                       (!turn?.author.is_human && turn?.candidates[0].is_final) || turn?.candidates[0].is_final)
                        disconnectHandlerAndResolve();
                } catch {
                    streamedMessage?.push(message);
                }

                this.websocket?.send(options.data);
            });
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
        this.userId = options.userId ?? 0;
    }
}