import API from "./api/API";
import Logger from "./Quaver.Server.API/src/utils/Logger";
import SqlDatabase from "./Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import ModeHelper from "./Quaver.Server.API/src/utils/ModeHelper";
import GameMode from "./Quaver.Server.API/src/enums/GameMode";

const TwitchBot = require("twitch-bot");
const config = require("./config/config.json");

export default class Encore {

    public static Instance: Encore

    /**
     * The API server for this instance of encore
     */
    private API : API

    /**
     * The Twitch bot instance
     */
    private Bot: any;

    /**
     * The URL for an individual Quaver Map
     */
    private QuaverMap: string = "https://quavergame.com/mapsets/map/";

    /**
     * The URL for a Quaver Mapset
     */
    private QuaverMapset: string = "https://quavergame.com/mapsets/";

    /**
     */
    constructor() {
        Encore.Instance = this;

        this.API = new API(config.port);

        this.Bot = new TwitchBot({
            username: config.twitch.bot.username,
            oauth: config.twitch.bot.oauth,
            channels: []
        })

        this.Bot.on("connected", async () => await this.JoinChannels());
        this.Bot.on("join", async (channel: string) => await this.OnJoin(channel));
        this.Bot.on("error", async (err: any) => await this.OnError(err));
        this.Bot.on("message", async (user: any) => await this.OnMessage(user));
    }

    /**
     * Joins the Twitch chats of all connected users
     */
    private async JoinChannels(): Promise<void> {
        const result = await SqlDatabase.Execute("SELECT twitch_username FROM users WHERE twitch_username IS NOT NULL", []);
  
        Logger.Info(`Attempting to join ${result.length} Twitch chat channels...`);

        for (let i = 0; i < result.length; i++)
            this.Bot.join(result[i].twitch_username);
    }

    /**
     * Called when the user has joined the Twitch channel
     * @param channel 
     */
    private async OnJoin(channel: string): Promise<void> {
        Logger.Info(`Successfullly joined channel: ${channel}`);
    }

    /**
     * Called when receiving a message in the Twitch channel
     * @param user 
     */
    private async OnMessage(user: any): Promise<void> {
        // Quaver Map (Individual)
        if (user.message.startsWith(this.QuaverMap))
            return await this.HandleQuaverMapRequest(user);
        // Quaver Mapset (Full Set)
        else if (user.message.startsWith(this.QuaverMapset))
            return await this.HandleQuaverMapsetRequest(user);
    }

    /**
     * Handles when users request an individual Quaver map
     * @param user 
     */
    private async HandleQuaverMapRequest(user: any): Promise<void> {
        try {
            const mapId: number = user.message.split(this.QuaverMap).pop();

            if (isNaN(mapId))
                return this.Bot.say(`@${user.username} The link you provided was not valid.`);

            const result = await SqlDatabase.Execute("SELECT * FROM maps WHERE id = ? LIMIT 1", [mapId]);

            if (result.length == 0) 
                return this.Bot.say(`@${user.username} the map you have tried to request could not be found.`);

            const map = result[0];

            const msg: string = `@${user.username} has requested map: ${map.artist} - ${map.title} [${map.difficulty_name}] ` + 
                                `(${map.difficulty_rating.toFixed(2)}) by ${map.creator_username}`;

            this.Bot.say(`${msg}. ${this.QuaverMap}${map.id}`, user.channel);

            Logger.Info(`${msg} to: ${user.channel}`);
        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Handles when a user requests an entire Quaver mapset
     * @param user 
     */
    private async HandleQuaverMapsetRequest(user: any): Promise<void> {
        try {
            const mapsetId: number = user.message.split(this.QuaverMapset).pop();

            if (isNaN(mapsetId))
                return this.Bot.say(`@${user.username} the link you provided was not valid.`);

            const result = await SqlDatabase.Execute("SELECT * FROM mapsets WHERE id = ? LIMIT 1", [mapsetId]);

            if (result.length == 0 || result[0].visible == 0)
                return this.Bot.say(`@${user.username} the mapset you have tried to request could not be found.`);

            const mapset = result[0];

            const msg: string = `@${user.username} has requested mapset: ${mapset.artist} - ${mapset.title} by ${mapset.creator_username}`;
            
            this.Bot.say(`${msg}. ${this.QuaverMapset}${mapset.id}`, user.channel);

            Logger.Info(`${msg} to ${user.channel}`);
        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Called when an error has occurred with the bot
     * @param err 
     */
    private async OnError(err: any): Promise<void> {
        Logger.Error(err);
    }
}