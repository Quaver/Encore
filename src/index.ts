import SqlDatabase from "./Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import Encore from "./Encore";
import RedisHelper from "./Quaver.Server.API/src/utils/database/redis/RedisHelper";
const config = require("./config/config.json");

export default class Program {
    /**
     * Main Execution Point
     */
    public static async Main(): Promise<void> {
        await SqlDatabase.Initialize(config.databaseSql.host, config.databaseSql.user, config.databaseSql.password, config.databaseSql.database, 10);
        await RedisHelper.Initialize(config.redis);
        new Encore();
    }
}

Program.Main();