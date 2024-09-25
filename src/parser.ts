
import { parse as jsonBigIntParse, stringify as jsonBigIntStringify, } from 'json-bigint'; 

class Parser {
    static async parseJSON(response: any, isRequest: boolean = true) {
        const text = isRequest ? await response.text() : response;
        try {
            return jsonBigIntParse(text);
        } catch {
            return text;
        }
    }
    static stringify(input: any) {
        return jsonBigIntStringify(input);
    }
}

export default Parser;
