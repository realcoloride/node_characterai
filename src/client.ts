import { EventEmitter } from 'stream';
import Parser from './parser';
import { PrivateProfile } from './profile/privateProfile';
import { PublicProfile } from './profile/publicProfile';
import Requester from './requester';
import { WebSocket } from 'ws';
import { CAIWebsocket, CAIWebsocketConnectionType, ICAIWebsocketMessage } from './websocket';
import { Conversation } from './chat/conversation';
import DMConversation from './chat/dmConversation';
import GroupChatConversation from './chat/groupChatConversation';

export default class CharacterAI extends EventEmitter {
    private token: string = "";
    public get authenticated() {
        return this.token != "";
    }
    
    public myProfile: PrivateProfile;
    public requester: Requester;
    
    // todo type safety for on('')

    private singleChatWebsocket: CAIWebsocket | null = null;
    private groupChatWebsocket: CAIWebsocket | null = null;
    private _connectionType: CAIWebsocketConnectionType | null = null;
    public get connectionType() { return this._connectionType; }


    private _currentConversation?: DMConversation | GroupChatConversation = undefined;
    public get currentConversation() { return this._currentConversation }

    private async openWebsockets() {
        try {
            const request = await this.requester.request("https://character.ai/", {
                method: "GET",
                includeAuthorization: false
            });
            const { headers } = request;
            const edgeRollout = headers.get("set-cookie")?.match(/edge_rollout=(\d+)/)?.at(1);
            if (!edgeRollout) throw Error("Could not get edge rollout");
    
            this.singleChatWebsocket = await new CAIWebsocket({
                url: "wss://neo.character.ai/connection/websocket",
                authorization: this.token,
                edgeRollout,
                userId: this.myProfile.userId
            }).open();

            this.groupChatWebsocket = await new CAIWebsocket({
                url: "wss://neo.character.ai/ws/",
                authorization: this.token,
                edgeRollout
            }).open();
        } catch (error) {
            throw Error("Failed opening websocket. Error:" + error);
        }
    }
    
    // todo indicate do not use if you dont know what you're doing
    async connectToConversation(id: string, isRoom: boolean, specificChatObject?: any): Promise<DMConversation | GroupChatConversation> {
        this.checkAndThrow(true, false);
        
        const { connectionType } = this;
        if (connectionType != CAIWebsocketConnectionType.Disconnected) throw Error(`You are already in a ${(connectionType == CAIWebsocketConnectionType.DM ? "DM" : "group chat")} conversation. Please disconnect from your current conversation (using characterAI.currentConversation.close()) to create and follow a new one.`);

        if (isRoom) {
            const request = await this.groupChatWebsocket?.sendAsync({
                data: Parser.stringify({ subscribe : { channel: `room:${id}`, id: 1 }}),
                messageType: CAIWebsocketConnectionType.GroupChat,
                awaitResponse: true,
                parseJSON: true,
                streaming: false
            });

            if (request.error) return request;

            // todo checking
            this._connectionType = CAIWebsocketConnectionType.GroupChat;
            this._currentConversation = new GroupChatConversation(this, request);
            return this._currentConversation;
        }

        // if no specific object fetch last conversation
        if (!specificChatObject) {
            const fetchRecentRequest = await this.requester.request(`https://neo.character.ai/chats/recent/${id}`, {
                method: 'GET',
                includeAuthorization: true
            });
            const fetchRecentResponse = await Parser.parseJSON(fetchRecentRequest);
            console.log(fetchRecentRequest);
            if (!fetchRecentRequest.ok) throw new Error(fetchRecentResponse);

            // todo set id from first AAAAA fetchRecentResponse.chats[];

        }

        this._connectionType = CAIWebsocketConnectionType.DM;

        // ressurect convo from the dead
        const resurectionRequest = await this.requester.request(`https://neo.character.ai/chats/recent/${id}`, {
            method: 'GET',
            includeAuthorization: true
        });

        const resurectionResponse = await Parser.parseJSON(resurectionRequest);
        if (!resurectionRequest.ok) throw new Error(resurectionResponse);

        this._currentConversation = new DMConversation(this, specificChatObject);
        return this._currentConversation;
    }

    constructor() {
        super();
        this.myProfile = new PrivateProfile(this);
        this.requester = new Requester();
    }

    // profile fetching
    async lookupProfile(username: string) {
        this.checkAndThrow(true, false);

        const profile = new PublicProfile(this, { username });
        await profile.fetch();
        
        return profile;
    }
    // character fetching
    async searchCharacter(query: string, suggested: boolean = false) {
        this.checkAndThrow(true, false);

    }
    async lookupCharacter(externalId: string) {
        this.checkAndThrow(true, false);

    }

    // suggestions
    async getRecentCharacters() {

    }

    // authentication
    async authenticate(sessionToken: string) {
        this.checkAndThrow(false, true);
        
        if (sessionToken.startsWith("Token "))
            sessionToken = sessionToken.substring("Token ".length, sessionToken.length);

        if (sessionToken.length != 40) console.warn(
`===============================================================================
WARNING: CharacterAI has changed its authentication methods again.
            For easier development purposes, usage of session tokens will be used.
            See: https://github.com/realcoloride/node_characterai/issues/146
===============================================================================`);

        this.requester.updateToken(sessionToken);

        const request = await this.requester.request("https://plus.character.ai/chat/user/settings/", {
            method: "GET",
            includeAuthorization: true
        });
        if (!request.ok) throw Error("Invaild session token.");

        this.token = sessionToken;

        // reload info
        await this.myProfile.fetch();

        // connect to endpoints
        await this.openWebsockets();
    }

    unauthenticate() {
        this.checkAndThrow(true, false);
        this.token = "";

        this.singleChatWebsocket?.close();
        this.groupChatWebsocket?.close();
    }

    throwBecauseNotAvailableYet() {
        throw Error("This feature is not available yet due to some restrictions from CharacterAI. Sorry!");
    }

    // allows for quick auth errors
    checkAndThrow(
        requiresAuthentication: boolean, 
        requiresNoAuthentication: boolean,
        requiresAuthenticatedMessage: string = "You must be authenticated to do this."
    ) {
        if (requiresAuthentication && !this.authenticated)
            throw Error(requiresAuthenticatedMessage);

        if (requiresNoAuthentication && this.authenticated) 
            throw Error("Already authenticated");
    }

    async fetchCategories() {

    }
    
    
}