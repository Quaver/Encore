import Game from "./Game";

export default class SongRequest {

    public MapGame: Game = Game.Quaver;

    public MapId: number = -1;

    public MapsetId: number = -1;

    public MapMd5: string | null = null;

    public Artist: string | null = null;

    public Title: string | null = null;

    public DifficultyName: string | null = null;

    public Creator: string | null = null;

    public DifficultyRating: number = -1;

    /**
     * @param game 
     * @param mapId 
     * @param mapsetId 
     * @param mapMd5 
     * @param artist 
     * @param title 
     * @param difficultyName 
     */
    constructor(game: Game, mapId: number, mapsetId: number, mapMd5: string | null, artist: string, title: string, 
        difficultyName: string | null, creator: string | null, difficultyRating: number) {
        this.MapGame = game;
        this.MapId = mapId;
        this.MapsetId = mapsetId;
        this.MapMd5 = mapMd5;
        this.Artist = artist;
        this.Title = title;
        this.DifficultyName = difficultyName;
        this.Creator = creator;
        this.DifficultyRating = difficultyRating;
    }
}