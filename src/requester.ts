
interface RequesterOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    includeAuthorization?: boolean;
    body?: string;
    contentType?: 'application/json';
}

export default class Requester {
    private authorization: string = "";
    updateToken(token: string) {
        this.authorization = `Token ${token}`;
    }

    async request(url: string, options: RequesterOptions) {
        let headers: any = {
            "User-Agent": "Character.AI",
            "DNT": "1",
            "Sec-GPC": "1",
            "Connection": "close",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "TE": "trailers",
        }
        
        if (options.includeAuthorization) headers["Authorization"] = this.authorization;
        if (options.body) headers["Content-Length"] = options.body.length;
        if (options.contentType) headers["Content-Type"] = options.contentType;

        return await fetch(url, {
            headers,
            method: options.method,
            body: options.body
        });
    }
}