import SqlDatabase from "./Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import RedisHelper from "./Quaver.Server.API/src/utils/database/redis/RedisHelper";
import Encore from "./Encore";
const config = require("./config/config.json");

export default class Program {
    /**
     * Main Execution Point
     */
    public static async Main(): Promise<void> {
        await RedisHelper.Initialize(config.databaseRedis);
        await SqlDatabase.Initialize(config.databaseSql.host, config.databaseSql.user, config.databaseSql.password, config.databaseSql.database, 10);

        new Encore();
    }
}

Program.Main();