const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs');

class Requester {
    browser = undefined;
    page = undefined;

    #initialized = false;
    #hasDisplayed = false;
    #headless = true; // BEWARE: HEADLESS IS SLOW!

    constructor() {

    }
    isInitialized() {
        return this.#initialized;
    }

    async initialize() {
        if (!this.isInitialized());

        console.log("[node_characterai] Puppeteer - This is an experimental feature. Please report any issues on github.");

        puppeteer.use(StealthPlugin())
        const browser = await puppeteer.launch({
            headless: this.#headless,
            args: [
                '--fast-start',
                '--disable-extensions',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--no-gpu',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--override-plugin-power-saver-for-testing=never',
                '--disable-extensions-http-throttling',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.3'
            ]
        });
        this.browser = browser;

        let page = await browser.pages();
        page = page[0];
        this.page = page;
        await page.setRequestInterception(false);

        page.setViewport({
            width: 1920 + Math.floor(Math.random() * 100),
            height: 3000 + Math.floor(Math.random() * 100),
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: false,
            isMobile: false,
        });
        await page.setJavaScriptEnabled(true);
        await page.setDefaultNavigationTimeout(0);

        const userAgent = 'CharacterAI/1.0.0 (iPhone; iOS 14.4.2; Scale/3.00)';
        await page.setUserAgent(userAgent);

        console.log("[node_characterai] Puppeteer - Done with setup");

    }

    async request(url, options) {
        const page = this.page;

        const method = options.method;
        /*(options.method == 'POST' || options.method == undefined || options.method == null
         ? 'POST' : 'GET');*/

        const body = (method == 'GET' ? {} : options.body);
        const headers = options.headers;

        let response

        try {
            const payload = {
                method: method,
                headers: headers,
                body: body
            }

            if (url.endsWith("/streaming/")) {
                await page.setRequestInterception(false);
                if (!this.#hasDisplayed) {
                    console.log("[node_characterai] Puppeteer - Eval-fetching is an experimental feature and may be slower. Please report any issues on github")
                    this.#hasDisplayed = true;
                }

                // Bless @roogue & @drizzle-mizzle for the code here!
                response = await page.evaluate(
                    async (payload, url) => {
                        const response = await fetch(url, payload);

                        const data = await response.text();
                        const matches = data.match(/\{.*\}/g);

                        const responseText = matches[matches.length - 1];

                        let result = {
                            code: 500,
                        }

                        if (!matches) result = null;
                        else {
                            result.code = 200;
                            result.response = responseText;
                        }

                        return result;
                    },
                    payload,
                    url
                );

                response.status = () => response.code // compatibilty reasons
                response.text = () => response.response // compatibilty reasons
            } else {
                if (url.includes("/beta.character.ai/")) {

                }
                await page.setRequestInterception(true);
                let initialRequest = true;

                page.once('request', request => {
                    var data = {
                        'method': method,
                        'postData': body,
                        'headers': headers
                    };

                    if (request.isNavigationRequest() && !initialRequest) {
                        return request.abort();
                    }

                    try {
                        initialRequest = false;
                        request.continue(data);
                    } catch (error) {
                        console.log("[node_characterai] Puppeteer - Non fatal error: " + error);
                    }
                });
                response = await page.goto(url, { waitUntil: 'networkidle2' });
            }
        } catch (error) {
            console.log("[node_characterai] Puppeteer - " + error)
        }

        return response;
    }
    
    async imageUpload(url, headers, localFile = false) {
        const page = this.page;

        let response

        try {
            await page.setRequestInterception(false);
            if (!this.#hasDisplayed) {
                console.log("[node_characterai] Puppeteer - Eval-fetching is an experimental feature and may be slower. Please report any issues on github")
                this.#hasDisplayed = true;
            }

            if (localFile) {
                let dataUrl = fs.readFileSync(url, "base64");
                response = await page.evaluate(
                    async (heads, dataUrl) => {
                            var result = {
                                code: 500
                            }

                            // Taken from https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
                            const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
                                const byteCharacters = atob(b64Data);
                                const byteArrays = [];

                                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                                    const slice = byteCharacters.slice(offset, offset + sliceSize);

                                    const byteNumbers = new Array(slice.length);
                                    for (let i = 0; i < slice.length; i++) {
                                        byteNumbers[i] = slice.charCodeAt(i);
                                    }

                                    const byteArray = new Uint8Array(byteNumbers);
                                    byteArrays.push(byteArray);
                                }

                                const blob = new Blob(byteArrays, {
                                    type: contentType
                                });
                                return blob;
                            }
                            const blob = b64toBlob(dataUrl.includes("base64,") ? dataUrl.split("base64,")[1] : dataUrl);
                            const file = new File([blob], "image");
                            const formData = new FormData();
                            formData.append("image", file);

                            let head = heads;
                            delete head["Content-Type"];

                            const resp = await fetch("https://beta.character.ai/chat/upload-image/", {
                                headers: heads,
                                method: "POST",
                                body: formData
                            })

                            if (resp.status == 200) {
                                result.code = 200;
                                let respJson = await resp.json();
                                result.response = respJson.value;
                            }

                            return result;
                        },
                        headers,
                        dataUrl
                );
            } else {
                response = await page.evaluate(
                    async (heads, url) => {
                            var result = {
                                code: 500
                            }

                            const resp = await fetch(url).then(resp => resp.blob()).then(async (blob) => {
                                const file = new File([blob], "image");
                                const formData = new FormData();
                                formData.append("image", file);

                                let head = heads;
                                delete head["Content-Type"];

                                const resp = await fetch("https://beta.character.ai/chat/upload-image/", {
                                    headers: heads,
                                    method: "POST",
                                    body: formData
                                })
                                return resp;
                            }).then()

                            if (resp.status == 200) {
                                result.code = 200;
                                let respJson = await resp.json();
                                result.response = respJson.value;
                            }

                            return result;
                        },
                        headers,
                        url
                );
            }

            response.status = () => response.code // compatibilty reasons
            response.body = () => response.response // compatibilty reasons
        } catch (error) {
            console.log("[node_characterai] Puppeteer - " + error)
        }

        return response;
    }
}

module.exports = Requester;
