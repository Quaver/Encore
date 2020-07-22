import SqlDatabase from "./Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import RedisHelper from "./Quaver.Server.API/src/utils/database/redis/RedisHelper";
import Encore from "./Encore";

export default class JoinTask {

    public static async Start() {
        const users = await SqlDatabase.Execute("SELECT id, twitch_username FROM users WHERE twitch_username IS NOT NULL", []);
        const statusKeys = await RedisHelper.keys("quaver:server:user_status:*");

        const channels = await JoinTask.ParseArray(Encore.Instance.Bot.channels, " ");
        const onlineUsers = await JoinTask.ParseArray(statusKeys, ":");

        for (let user in users) {
            if (!channels.includes(`#${users[user].twitch_username}`)) {
                if (onlineUsers.includes(`${users[user].id}`)) {
                    Encore.Instance.Bot.join(`${users[user].twitch_username}`);
                }
            } else {
                if (!onlineUsers.includes(`${users[user].id}`)) {
                    Encore.Instance.Bot.part(`${users[user].twitch_username}`);
                }
            }
        }
    }

    public static Sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static async ParseArray(array: any, split_string: any): Promise<any> {
        let temp = [];

        for (let arr in array) {
            const split = array[arr].split(split_string);
            temp.push(split[split.length - 1]);
        }

        return temp;
    }

}