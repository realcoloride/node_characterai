import Parser from './parser';
import PrivateProfile from './profile/privateProfile';
import Requester from './requester';

export default class CAIClient {
    private token: string = "";
    public get authenticated() {
        return this.token != "";
    }
    
    public myProfile: PrivateProfile;
    public requester: Requester;
    
    constructor() {
        this.myProfile = new PrivateProfile(this);
        this.requester = new Requester();
    }

    // profiles/fetching
    

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

        // reload info
        await this.myProfile.fetch();
    }

    unauthenticate() {
        if (!this.authenticated) return;
        this.token = "";
    }



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