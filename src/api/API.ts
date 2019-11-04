import express from "express";
import bodyParser = require("body-parser");
import Router from "./routes/Router";
import Login from "./controllers/Login";
import Logger from "../Quaver.Server.API/src/utils/Logger";
const passport = require("passport");
const config = require("../config/config.json");

export default class API {
    /**
     * The port the server will run on
     */
    public Port: Number;

    /**
     * The express server
     */
    public ExpressApp: express.Application;

    /**
     * @param port 
     */
    constructor(port: number) {
        this.Port = port;
        this.ExpressApp = express();

        this.InitializeServer();
    }

        /**
     * Initializes and runs the server.
     * @constructor
     */
    private InitializeServer(): void {        
        this.ExpressApp.use(bodyParser.json());
        this.ExpressApp.use(bodyParser.urlencoded({extended: true}));

        this.ExpressApp.use(require('express-session')({ secret: config.expressSessionSecret, resave: true, saveUninitialized: true }));
        
        Login.Initialize();
        Login.ConfigurePassport();
        
        this.ExpressApp.use(passport.initialize());
        this.ExpressApp.use(passport.session());
        
        this.ExpressApp.use("/", Router.InitializeRouter(this.ExpressApp));
        this.ExpressApp.listen(this.Port, () => Logger.Success(`Encore API server has started on port: ${config.port}`));
    }
}