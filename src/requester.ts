
interface RequesterOptions {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    includeAuthorization?: boolean;
    body?: string;
    contentType?: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data';
    formData?: Record<string, string | Blob>;
    fileFieldName?: string;
}

// responsible for requests
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
            "TE": "trailers"
        }
        
        let body: any = options.body;

        if (options.includeAuthorization) headers["Authorization"] = this.authorization;
        if (options.contentType) headers["Content-Type"] = options.contentType;

        if (options.formData) {
            const formData = options.contentType == 'application/x-www-form-urlencoded' ? new URLSearchParams() : new FormData();
            Object.entries(options.formData).forEach((entry) => formData.append(entry[0], entry[1] as any));
            body = formData;
        }
        
        if (typeof body === "string") headers["Content-Length"] = body.length;
        
        return await fetch(url, { headers, method: options.method, body });
    }
}