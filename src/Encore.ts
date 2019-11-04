import API from "./api/API";

const TwitchBot = require("twitch-bot");
const config = require("./config/config.json");

export default class Encore {
    /**
     * The API server for this instance of encore
     */
    private API : API

    constructor() {
        this.API = new API(config.port);
    }
}