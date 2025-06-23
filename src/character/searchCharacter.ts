import { getterProperty, hiddenProperty } from "../utils/specable";
import { Character } from "./character";

export enum CharacterTags {
    None = "",
    Anime = "0",
    Artist = "1",
    Boss = "2",
    Bully = "3",
    Coach = "4",
    // Must find that one
    Unknown5 = "5",
    Designer = "6",
    Family = "7",
    Famous = "8",
    Gaming = "9",
    Hero = "10",
    Kpop = "11",
    Lifestyle = "12",
    Mafia = "13",
    Maid = "14",
    Music = "15",
    Police = "16",
    Professor = "17",
    RPG = "18",
    Romance = "19",
    Solider = "20",
    Student = "21",
    Teacher = "22",
    Vampire = "23"
}

export class SearchCharacter extends Character {
    @hiddenProperty
    private document_id = "";

    // score / search_score
    private score?: number = undefined;
    @hiddenProperty
    private search_score?: number = undefined;
    @getterProperty
    public get searchScore() { return this.search_score ?? this.score ?? 0.0; }

    public priority = 0;

    // tag_id
    @hiddenProperty
    private tag_id: CharacterTags = CharacterTags.None;
    @getterProperty
    public get tagId() { return this.tag_id; }

    // tag
    public tag: string = "";
    
    // created_at
    @hiddenProperty
    private created_at: number = 0;
    @getterProperty
    public get createdAt() { return this.created_at; }

    // updated_at
    @hiddenProperty
    private updated_at: number = 0;
    @getterProperty
    public get updatedAt() { return this.updated_at; }
    
    // _distance
    @hiddenProperty
    private _distance: any;
    @getterProperty
    public get distance() { return this._distance; }
}