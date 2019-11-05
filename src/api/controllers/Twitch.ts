import Logger from "../../Quaver.Server.API/src/utils/Logger";
import Responses from "../../Quaver.Server.API/src/utils/Responses";
import SqlDatabase from "../../Quaver.Server.API/src/utils/database/sql/SqlDatabase";
import Encore from "../../Encore";
const passport = require('passport');

export default class Twitch {
    /**
     * Handles checking if the user's twitch is connected/connecting their twitch
     * @param req 
     * @param res 
     */
    public static async Auth(req: any, res: any): Promise<void> {
        try {
            if (!req.user)
                return res.redirect("/login");

                
            if (req.user.twitch_username) {
                return res.status(200).json({
                    status: 200,
                    message: "Your Twitch account has been successfully connected to your Quaver account. You can close this page now!"
                });
            }

            return res.redirect("/auth/twitch");
        } catch (err) {
            Logger.Error(err);
            return Responses.Return500(req, res);
        }
    }

    /**
     * @param req 
     * @param res 
     */
    public static async Callback(req: any, res: any, next: any): Promise<void> {
        try {
            if (!req.user)
                return res.redirect("/");

            passport.authenticate("twitch", async (err: any, user: any, info: any) => {
                await SqlDatabase.Execute("UPDATE users SET twitch_username = ? WHERE id = ?", [user.data[0].login, req.user.id]);
                Logger.Info(`Updated Twitch account for ${req.user.username} (#${req.user.id}) [${user.data[0].login} <${user.data[0].id}>]`);

                // Join the user's Twitch channel
                Encore.Instance.Bot.join(`${user.data[0].login}`);

                // Publish twitch connection to redis, so Albatross can take care of alerting the user
                Encore.Instance.RedisClient.publish("quaver:twitch_connection", JSON.stringify({
                    user_id: req.user.id,
                    twitch_username: user.data[0].login
                }));

                res.redirect("/checktwitch");
            })(req, res, next);

        } catch (err) {
            Logger.Error(err);
            return Responses.Return500(req, res);
        }
    }
}