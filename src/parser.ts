
import { parse as jsonBigIntParse, stringify as jsonBigIntStringify, } from 'json-bigint'; 

class Parser {
    static async parseJSON(response: any) {
        const text = await response.text();
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
