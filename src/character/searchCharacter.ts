import { getterProperty, hiddenProperty } from "../utils/specable";
import { Character } from "./character";

export class SearchCharacter extends Character {
    @hiddenProperty
    private document_id = "";

    @hiddenProperty
    private search_score = 0;
    @getterProperty
    public get searchScore() { return this.search_score; }

    public priority = 0;
}