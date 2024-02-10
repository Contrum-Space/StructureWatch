require('dotenv').config();
import express, { Request, Response } from 'express';
import session from 'express-session';
import Bot from './models/Bot';
import ESI from './models/ESI';
import EmbedMaker from './models/EmbedMaker';

import passport from 'passport';
const EveOnlineSsoStrategy = require('passport-eveonline-sso');

const app = express();

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 28080000000 }
}));

new ESI(process.env.CLIENTID!, process.env.SECRETKEY!);

const strategy = new EveOnlineSsoStrategy({
    clientID: process.env.CLIENTID,
    secretKey: process.env.SECRETKEY,
    callbackURL: process.env.CALLBACK,
    scope: process.env.SCOPES
},
    function (accessToken: any, refreshToken: any, profile: any, done: any) {
        ESI.setUser(accessToken, refreshToken);
        return done(null, profile);
    }
)

passport.use(strategy);

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user: any, done) {
    done(null, user);
});

app.listen(8000);

app.get('/success', (req: Request, res: Response) => {
    res.send(`Bot is linked to new account successfully with access token - ${ESI.accessToken}`);
})

app.get('/auth', passport.authenticate('eveonline-sso'));

app.get('/auth/callback',
    passport.authenticate('eveonline-sso', { successReturnToOrRedirect: '/success', failureRedirect: '/auth' }));

new Bot(process.env.BOTTOKEN!,"1153094148287631450","1156222835434459298");
