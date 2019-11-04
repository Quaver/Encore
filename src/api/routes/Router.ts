import * as express from "express";
import Login from "../controllers/Login";
import Twitch from "../controllers/Twitch";
const passport = require('passport');

export default class Router {
    /**
     * @param app 
     */
    public static InitializeRouter(app: Express.Application): express.Router {
        const router: express.Router = express.Router();

        router.route("/").get((req, res) => {
            if (req.user)
                return res.redirect("/checktwitch");
            else
                return res.redirect("/login");
        });

        router.route("/login").get(Login.GET);
        router.route("/logout").get(Login.LogoutGET);
        router.route("/verify").get(Login.VerifyGET);
        router.route("/checktwitch").get(Twitch.Auth)
        router.route("/auth/twitch").get(passport.authenticate('twitch', { scope: 'user_read' }));
        router.route("/auth/twitch/callback").get(Twitch.Callback);

        router.route("*").get((req, res) => res.redirect("/"));

        return router;
    }
}