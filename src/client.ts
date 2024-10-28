import { EventEmitter } from 'stream';
import Parser from './parser';
import { PrivateProfile } from './profile/privateProfile';
import { PublicProfile } from './profile/publicProfile';
import Requester from './requester';
import { CAIWebsocket, CAIWebsocketConnectionType, ICAIWebsocketCommand, ICAIWebsocketMessage } from './websocket';
import { Conversation } from './chat/conversation';
import DMConversation from './chat/dmConversation';
import GroupChatConversation from './groupchat/groupChatConversation';
import { Character } from './character/character';
import { v4 as uuidv4 } from 'uuid';
import { GroupChats } from './groupchat/groupChats';

export enum CheckAndThrow {
    RequiresAuthentication = 0,
    RequiresNoAuthentication,
    RequiresToBeConnected,
    RequiresToBeInDM,
    RequiresToBeInGroupChat,
    RequiresToNotBeConnected
}

export default class CharacterAI extends EventEmitter {
    private token: string = "";
    public get authenticated() {
        return this.token != "";
    }
    
    public myProfile: PrivateProfile;
    public requester: Requester;
    public groupChats: GroupChats;

    // todo type safety for on('')

    private dmChatWebsocket: CAIWebsocket | null = null;
    async sendDMWebsocketAsync(options: ICAIWebsocketMessage) { 
        return await this.dmChatWebsocket?.sendAsync(options); 
    }
    async sendDMWebsocketCommandAsync(options: ICAIWebsocketCommand) {
        const requestId = uuidv4();
        return await this.sendDMWebsocketAsync({
            parseJSON: true,
            expectedReturnCommand: options.expectedReturnCommand,
            messageType: CAIWebsocketConnectionType.DM,
            waitForAIResponse: options.waitForAIResponse ?? true,
            expectedRequestId: requestId,
            streaming: options.streaming,
            data: Parser.stringify({
                command: options.command,
                origin_id: options.originId,
                payload: options.payload,
                request_id: requestId
            })
        });
    }

    private groupChatWebsocket: CAIWebsocket | null = null;
    async sendGroupChatWebsocketAsync(options: ICAIWebsocketMessage) { this.groupChatWebsocket?.sendAsync(options); }
    async sendGroupChatWebsocketCommandAsync(options: ICAIWebsocketCommand) {
        const requestId = uuidv4();
        // todo
        return await this.sendDMWebsocketAsync({
            parseJSON: true,
            expectedReturnCommand: options.expectedReturnCommand,
            messageType: CAIWebsocketConnectionType.DM,
            waitForAIResponse: true,
            expectedRequestId: requestId,
            streaming: options.streaming,
            data: Parser.stringify({
                command: options.command,
                origin_id: options.originId,
                payload: options.payload,
                request_id: requestId
            })
        });
    }

    private _connectionType: CAIWebsocketConnectionType = CAIWebsocketConnectionType.Disconnected;
    public get connectionType() { return this._connectionType; }

    private _currentConversation?: DMConversation | GroupChatConversation = undefined;
    public get currentConversation() { return this._currentConversation }

    public autoReconnecting = true; // todo

    private async openWebsockets() {
        try {
            const request = await this.requester.request("https://character.ai/", {
                method: "GET",
                includeAuthorization: false
            });
            const { headers } = request;
            const edgeRollout = headers.get("set-cookie")?.match(/edge_rollout=(\d+)/)?.at(1);
            if (!edgeRollout) throw Error("Could not get edge rollout");
    
            // todo listen for events

            this.groupChatWebsocket = await new CAIWebsocket({
                url: "wss://neo.character.ai/connection/websocket",
                authorization: this.token,
                edgeRollout,
                userId: this.myProfile.userId
            }).open(true);

            this.dmChatWebsocket = await new CAIWebsocket({
                url: "wss://neo.character.ai/ws/",
                authorization: this.token,
                edgeRollout,
                userId: this.myProfile.userId
            }).open(false);
        } catch (error) {
            throw Error("Failed opening websocket. Error:" + error);
        }
    }
    
    // todo indicate do not use if you dont know what you're doing
    async connectToConversation(id: string, isRoom: boolean, specificChatObject?: any): Promise<DMConversation | GroupChatConversation> {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        
        const { connectionType } = this;
        if (connectionType != CAIWebsocketConnectionType.Disconnected) throw Error(`You are already in a ${(connectionType == CAIWebsocketConnectionType.DM ? "DM" : "group chat")} conversation. Please disconnect from your current conversation (using characterAI.currentConversation.close()) to create and follow a new one.`);

        if (isRoom) {
            let request:any; // todo
            /*const request = await this.groupChatWebsocket?.sendAsync({
                data: Parser.stringify({ subscribe : { channel: `room:${id}`, id: 1 }}),
                messageType: CAIWebsocketConnectionType.GroupChat,
                awaitResponse: true,
                parseJSON: true,
                streaming: false
            });*/

            if (request.error) return request;

            // todo checking
            this._connectionType = CAIWebsocketConnectionType.GroupChat;
            this._currentConversation = new GroupChatConversation(this, request);
            await this._currentConversation.refreshMessages();
            return this._currentConversation;
        }

        // if no specific object fetch latest conversation
        if (!specificChatObject) {
            const fetchRecentRequest = await this.requester.request(`https://neo.character.ai/chats/recent/${id}`, {
                method: 'GET',
                includeAuthorization: true
            });
            const fetchRecentResponse = await Parser.parseJSON(fetchRecentRequest);
            if (!fetchRecentRequest.ok) throw new Error(fetchRecentResponse);

            specificChatObject = fetchRecentResponse.chats[0];
        }

        return await this.connectToDMConversationDirectly(new DMConversation(this, specificChatObject));
    }
    async connectToDMConversationDirectly(conversation: DMConversation) {
        this.checkAndThrow(CheckAndThrow.RequiresToNotBeConnected);
        
        // ressurect convo from the dead
        const resurectionRequest = await this.requester.request(`https://neo.character.ai/chats/recent/${conversation.chatId}`, {
            method: 'GET',
            includeAuthorization: true
        });
        const resurectionResponse = await Parser.parseJSON(resurectionRequest);
        if (!resurectionRequest.ok) throw new Error(resurectionResponse);

        this._currentConversation = conversation;
        await this._currentConversation.refreshMessages();
        this._connectionType = CAIWebsocketConnectionType.DM;

        return this._currentConversation;
    }
    disconnectFromConversation() {
        this._connectionType = CAIWebsocketConnectionType.Disconnected;
        this._currentConversation = undefined;

        this.dmChatWebsocket?.close();
        this.groupChatWebsocket?.close();
    }

    constructor() {
        super();
        this.myProfile = new PrivateProfile(this);
        this.requester = new Requester();
        this.groupChats = new GroupChats(this);
    }

    // profile fetching
    async fetchProfileByUsername(username: string) {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const profile = new PublicProfile(this, { username });
        await profile.fetch();
        
        return profile;
    }
    async fetchProfileById(userId: number) {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        // not available yet
        this.throwBecauseNotAvailableYet();
    }
    // character fetching
    async searchCharacter(query: string, suggested: boolean = false): Promise<Character[]> {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const encodedQuery = encodeURIComponent(Parser.stringify({
            "0": {"json": {"searchQuery": "character"}}
        }));

        const request = await this.requester.request(`https://character.ai/api/trpc/search.search?batch=1&input=${encodedQuery}`, {
            method: 'GET',
            includeAuthorization: true,
            contentType: 'application/json'
        });

        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);

        let characters: Character[] = [];


        return characters;
    }
    async fetchCharacter(characterId: string) {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.requester.request("https://plus.character.ai/chat/character/info/", {
            method: 'POST',
            body: Parser.stringify({ external_id: characterId }),
            includeAuthorization: true,
            contentType: 'application/json'
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error("Failed to fetch character");

        return new Character(this, response.character);
    }

    // suggestions/discover
    async getFeaturedCharacters() {

    }
    async getRecommendedCharactersForYou() {

    }
    async getCharacterCategories() {

    }
    async getRecentCharacters() {

    }

    // conversations
    // raw is the raw output else the convo instance
    async fetchConversation(chatId: string, raw: boolean = false) {
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);

        const request = await this.requester.request(`https://neo.character.ai/chat/${chatId}/`, {
            method: 'GET',
            includeAuthorization: true,
        });
        const response = await Parser.parseJSON(request);
        if (!request.ok) throw new Error(response);
        const data = response.chat;

        const conversation = raw ? data : new Conversation(this, data);
        if (!raw) await conversation.refreshMessages();

        return conversation;
    }

    // authentication
    async authenticate(sessionToken: string) {
        this.checkAndThrow(CheckAndThrow.RequiresNoAuthentication);
        
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
        this.checkAndThrow(CheckAndThrow.RequiresAuthentication);
        this.token = "";

        this.disconnectFromConversation();
        this.removeAllListeners();
    }

    throwBecauseNotAvailableYet() {
        throw Error("This feature is not available yet due to some restrictions from CharacterAI. Sorry!");
    }

    // allows for quick auth errors
    checkAndThrow(
        argument: CheckAndThrow,
        requiresAuthenticatedMessage: string = "You must be authenticated to do this."
    ) {
        if ((argument == CheckAndThrow.RequiresAuthentication || 
             argument >= CheckAndThrow.RequiresToBeConnected) && !this.authenticated) 
            throw Error(requiresAuthenticatedMessage);

        if (argument == CheckAndThrow.RequiresNoAuthentication && this.authenticated) 
            throw Error("Already authenticated");

        const { connectionType } = this;
        if (argument == CheckAndThrow.RequiresToNotBeConnected && connectionType != CAIWebsocketConnectionType.Disconnected)
            throw Error(`You are already in a ${(connectionType == CAIWebsocketConnectionType.DM ? "DM" : "group chat")} conversation. Please disconnect from your current conversation (using characterAI.currentConversation.close()) to create and follow a new one.`);
        
        if (argument == CheckAndThrow.RequiresToBeConnected && connectionType == CAIWebsocketConnectionType.Disconnected)
            throw Error("This action requires you to be connected to a DM or a Group Chat.");

        if (argument == CheckAndThrow.RequiresToBeInDM && connectionType != CAIWebsocketConnectionType.DM) 
            throw Error("This action requires you to be connected to a DM.");

        if (argument == CheckAndThrow.RequiresToBeInGroupChat && connectionType != CAIWebsocketConnectionType.GroupChat)
            throw Error("This action requires you to be connected to a Group Chat.");
    }
}