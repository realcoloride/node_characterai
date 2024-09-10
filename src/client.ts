import Profile from './profile/profile';

class Client {
    private token = undefined;
    public get authenticated() {
        return this.token != undefined;
    }
    
    private profile: Profile;


    // authentication
    authenticate(sessionToken: string) {
        this.checkAndThrow(false, true);
        
        await this.requester.initialize();
        
        if (sessionToken.length != 40) console.warn(
`===============================================================================
WARNING: CharacterAI has changed its authentication methods again.
            For easier development purposes, usage of session tokens will be used.
            See: https://github.com/realcoloride/node_characterai/issues/146
===============================================================================`);

        
        const request = await this.requester.request("https://character.ai/api/ping", {
            method: "GET",
            headers: {
                "Authorization": `Token ${sessionToken}`
            }
        });

        console.log(request);

    }

    unauthenticate() {
        if (!this.authenticated) return;
        this.token = undefined;
        this.requester.uninitialize();
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