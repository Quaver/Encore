import Responses from "../../Quaver.Server.API/src/utils/Responses";
import SqlDatabase from "../../Quaver.Server.API/src/utils/database/sql/SqlDatabase";

const passport = require("passport");
const LocalStrategy = require("passport-local");
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const openid = require("openid");
const request = require('request');
const config = require("../../config/config.json");

export default class Login {
    /**
     * Relying party for the openid
     */
    public static RelyingParty: any = null;

    /**
     * Initializes the login handler/relying party for Steam OpenID
     * @constructor
     */
    public static Initialize(): void {
        Login.RelyingParty = new openid.RelyingParty(`${config.baseUrl}/verify`, config.baseUrl, true, true, []);

        OAuth2Strategy.prototype.userProfile = (accessToken: any, done: any) => {
            let options = {
                url: 'https://api.twitch.tv/helix/users',
                method: 'GET',
                headers: {
                  'Client-ID': config.twitch.auth.clientId,
                  'Accept': 'application/vnd.twitchtv.v5+json',
                  'Authorization': 'Bearer ' + accessToken
                }
            };

            request(options, function (error: any, response: any, body: any) {
                if (response && response.statusCode == 200) {
                  done(null, JSON.parse(body));
                } else {
                  done(JSON.parse(body));
                }
            });
        };

        passport.use('twitch', new OAuth2Strategy({
            authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
            tokenURL: 'https://id.twitch.tv/oauth2/token',
            clientID: config.twitch.auth.clientId,
            clientSecret: config.twitch.auth.clientSecret,
            callbackURL: config.twitch.auth.callbackUrl,
            state: true
          },
          function(accessToken: any, refreshToken: any, profile: any, next: any) {

            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            console.log(profile);
        
            next(null, profile);
          }
        ));
    }

    /**
     * Redirects the user to log into Steam
     * 
     * Route: /login
     * @constructor
     */
    public static async GET(req: any, res: any): Promise<void> {
        try {
            if (req.user)
                return res.redirect("/checktwitch");
            
            const url = await Login.Authenticate();
            return res.redirect(url);
        } catch (err) {
            console.error(err);
            Responses.Return500(req, res);
        }
    }

    /**
     * Logs the user out
     * @param req
     * @param res
     * @constructor
     */
    public static async LogoutGET(req: any, res: any): Promise<void> {
        req.logout();
        res.redirect('/');
    }
    
    /**
     * Verifies the user's login
     * 
     * Route: /verify
     * @param req
     * @param res
     * @constructor
     */
    public static async VerifyGET(req: any, res: any): Promise<void> {
        try {
            if (req.user)
                return res.redirect("/checktwitch");
            
            const verification = await Login.VerifyAssertion(req);
            
            // Make sure the user is properly authenticated
            if (!verification.authenticated)
                return Responses.Return401(req, res);

            const steamId = verification.claimedIdentifier.replace('https://steamcommunity.com/openid/id/', "");
            
            // Get the user by steam id.
            const result = await SqlDatabase.Execute("SELECT * FROM users WHERE steam_id = ? LIMIT 1", [steamId]);
            
            if (result.length == 0)
                return Responses.Return401(req, res);
            
            const user = result[0];
            
            // Prevent ban users from logging in
            if (!user.allowed)
                return Responses.Return401(req, res);
            
            req.login(user, (err: any)  => {
                if (err) {
                    console.error(err);
                    return Responses.Return401(req,  res);
                } 
                
                return res.redirect("/");
            });
            
        } catch (err) {
            console.error(err);
            return res.send("no");
        }
    }
    
    /**
     * Retrieves an authentication URL to log into Steam.
     * @constructor
     */
    public static async Authenticate(): Promise<any> {
        return new Promise((resolve, reject) => {
            Login.RelyingParty.authenticate("http://steamcommunity.com/openid", false, (err: any, url: any) => {
                if (err)
                    console.error(err);

                if (err || !url)
                    return resolve(undefined);

                return resolve(url);
            });
        });
    }

    /**
     * Verifies that an incoming login request user is who they claim to be.
     * @param req
     * @constructor
     */
    public static async VerifyAssertion(req: any): Promise<any> {
        return new Promise((resolve, reject) => {
            Login.RelyingParty.verifyAssertion(req, (err: any, result: any) => {
                if (err)
                    return reject(err);

                if (!result || !result.authenticated)
                    return reject("Failed to authenticate user");

                return resolve(result);
            });
        });
    }
    
    public static ConfigurePassport(): void {
        passport.serializeUser((user: any, done: any) => {
            done(null, user);
        });

        passport.deserializeUser(async (user: any, done: any) => {
            const result = await SqlDatabase.Execute("SELECT * FROM users WHERE id = ? AND allowed = 1 LIMIT 1", [user.id]);
            
            if (result.length == 0)
                return done(null, false);
            
            return done(null, result[0]);
        });
    } 
}