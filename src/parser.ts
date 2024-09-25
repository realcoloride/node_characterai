
import { parse as jsonBigIntParse, stringify as jsonBigIntStringify, } from 'json-bigint'; 

class Parser {
    static async parseJSON(response: any) {
        return jsonBigIntParse(await response.text());
    }
    static stringify(input: any) {
        return jsonBigIntStringify(input);
    }
}

export default Parser;
