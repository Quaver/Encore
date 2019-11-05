import API from "./api/API";
import Logger from "./Quaver.Server.API/src/utils/Logger";
import SqlDatabase from "./Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import ModeHelper from "./Quaver.Server.API/src/utils/ModeHelper";
import GameMode from "./Quaver.Server.API/src/enums/GameMode";
import SongRequest from "./SongRequest";
import Game from "./Game";
import { RedisClient } from "redis";
import * as redis from "redis";
const axios = require("axios");
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
    public Bot: any;

    /**
     * Used to publish messages to redis
     */
    public RedisClient: RedisClient;

    /**
     * The URL for an individual Quaver Map
     */
    private QuaverMap: string = "https://quavergame.com/mapsets/map/";

    /**
     * The URL for a Quaver Mapset
     */
    private QuaverMapset: string = "https://quavergame.com/mapsets/";

    /**
     * The URL for a "new" osu! beatmap link
     * 
     * Full Version: https://osu.ppy.sh/beatmapsets/<beatmapset_id>#mania/<beatmap_id>
     */
    private OsuBeatmap: string = "https://osu.ppy.sh/beatmapsets/";

    /**
     * The URL for the old osu! website's beatmaps
     */
    private OsuBeatmapOld: string = "https://osu.ppy.sh/b/";

    /**
     */
    constructor() {
        Encore.Instance = this;

        this.RedisClient = redis.createClient(config.redis);
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
        // New osu! beatmap set
        else if (config.osuApiKey && user.message.startsWith(this.OsuBeatmap))
            return await this.HandleOsuBeatmapSetRequest(user);
        else if (config.osuApiKey && user.message.startsWith(this.OsuBeatmapOld))
            return await this.HandleOsuBeatmapOld(user);
        // Old osu! beatmap set (unsupported)
        else if (config.osuApiKey && user.message.startsWith("https://osu.ppy.sh/s/"))
            return this.Bot.say(`@${user.username} /s/ links are not supported. Please use /b/ links or the new osu! website to request.`, user.channel);
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

            await this.PublishRequest(user, new SongRequest(Game.Quaver, map.id, map.mapset_id, map.md5, map.artist, map.title, 
                                                map.difficulty_name, map.creator_username, map.difficulty_rating));

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

            
            await this.PublishRequest(user, new SongRequest(Game.Quaver, -1, mapset.id, null, mapset.artist, mapset.title, null, mapset.creator_username, 0));

            this.Bot.say(`${msg}. ${this.QuaverMapset}${mapset.id}`, user.channel);
            Logger.Info(`${msg} to ${user.channel}`);
        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Handles when users request an osu! beatmap from the new website
     * @param user 
     */
    private async HandleOsuBeatmapSetRequest(user: any): Promise<void> {
        try {
            const regex = /^https:\/\/osu.ppy.sh\/beatmapsets\/[0-9]+#mania\/([0-9]+)/g;
            const match = regex.exec(user.message);

            if (!match)
                return this.Bot.say(`@${user.username} the link you provided was not valid.`);
            
            const mapId = match[1];
            await this.HandleOsuBeatmap(user, mapId);

        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Handles when a user requests an osu! beatmap from the old website
     * @param user 
     */
    private async HandleOsuBeatmapOld(user: any): Promise<void> {
        try {
            const mapId: number = user.message.replace("?m=3", "").split(this.OsuBeatmapOld).pop();

            if (isNaN(mapId))
                return this.Bot.say(`@${user.username} the link you provided was not valid.`);

            await this.HandleOsuBeatmap(user, mapId);

        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Handles the request for an individual osu! beatmap (/b/id)
     * @param user 
     * @param mapId 
     */
    private async HandleOsuBeatmap(user: any, mapId: any): Promise<void> {
        try {
            const endpoint: string = `https://osu.ppy.sh/api/get_beatmaps?k=${config.osuApiKey}&b=${mapId}`;
            const response = await axios.get(endpoint);
            const map = response.data[0];

            const msg = `@${user.username} has requested map: ${map.artist} - ${map.title} [${map.version}] ` + 
                        `(${parseFloat(map.difficultyrating).toFixed(2)}) by ${map.creator}`;
                  

            await this.PublishRequest(user, new SongRequest(Game.Osu, map.beatmap_id, map.beatmapset_id, map.file_md5, map.artist,
                                                    map.title, map.version, map.creator, parseFloat(map.difficultyrating)));

            this.Bot.say(`${msg}. https://osu.ppy.sh/b/${mapId}`, user.channel);
            Logger.Info(`${msg} to ${user.channel}`);

        } catch (err) {
            Logger.Error(err);
            this.Bot.say(`There was an error handling @${user.username}'s song request.`, user.channel);
        }
    }

    /**
     * Publishes the song request to Redis where Albatross will handle it and send it to the user
     * in-game if they are online.
     */
    private async PublishRequest(user: any, request: SongRequest): Promise<void> {
        try {
            const userCheck = await SqlDatabase.Execute("SELECT id, username FROM users WHERE twitch_username = ? LIMIT 1", [user.channel.replace("#", "")]);

            if (userCheck.length == 0)
                throw new Error("User twitch channel is not connected!");

            const redisMessage = {
                user_id: userCheck[0].id,
                request: {
                    twitch_username: user.username,
                    game: request.MapGame,
                    map_id: request.MapId,
                    mapset_id: request.MapsetId,
                    map_md5: request.MapMd5,
                    artist: request.Artist,
                    title: request.Title,
                    difficulty_name: request.DifficultyName,
                    creator: request.Creator,
                    difficulty_rating: request.DifficultyRating
                }
            };

            this.RedisClient.publish(`quaver:song_requests`, JSON.stringify(redisMessage), () => Logger.Success(`Successfully published @${user.username}'s request ` + 
                `for ${userCheck[0].username} (#${userCheck[0].id}) to Redis.`));

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