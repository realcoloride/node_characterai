var JSONbig = require("json-bigint");

class Parser {
    static async parseJSON(response: string) {
        const result = JSONbig.parse(await response.text());
        return result;
    }
    static stringify(text: any) {
        const result = JSON.stringify(text);
        return result;
    }
}

export default Parser;
