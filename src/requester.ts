
interface RequesterOptions {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT';
    includeAuthorization?: boolean;
    body?: string;
    contentType?: 'application/json' | 'application/x-www-form-urlencoded';
    formData?: Record<string, string>;
    file?: File | Blob;
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
            "TE": "trailers",
        }
        
        let body: any = options.body;

        if (options.includeAuthorization) headers["Authorization"] = this.authorization;
        if (options.contentType) headers["Content-Type"] = options.contentType;

        if (options.file) {
            const formData = new FormData();
            formData.append(options.fileFieldName || "file", options.file);
            Object.entries(options.formData || {}).forEach(([key, value]) => formData.append(key, value));
            body = formData;
        }

        if (!body && options.formData) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            body = new URLSearchParams(options.formData).toString();
        }

        if (!body && options.contentType && options.body) {
            headers["Content-Type"] = options.contentType;
            body = options.body;
        }
        
        if (typeof body === "string") headers["Content-Length"] = body.length;

        return await fetch(url, {
            headers,
            method: options.method,
            body: options.body
        });
    }
}