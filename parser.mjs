import JSONbig from "json-bigint";

export class Parser {
  static async parseJSON(response) {
    const result = JSONbig.parse(await response.text());
    return result;
  }
  static stringify(text) {
    const result = JSON.stringify(text);
    return result;
  }
}
