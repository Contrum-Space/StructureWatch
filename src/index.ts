require('dotenv').config();
import express, { Request, Response } from 'express';
import session from 'express-session';
import Bot from './models/Bot';
import ESI from './models/ESI';

import client from 'prom-client';

const notificationCounter = new client.Gauge({
    name: 'notification_counter',
    help: 'Counts the number of notifications'
});

const minFuelStructure = new client.Gauge({
    name: 'min_fuel_structure',
    help: 'Gauge for minimum fuel structure',
    labelNames: ['structure'],
});

const structureMetrics = new client.Gauge({
    name: 'structure_metrics',
    help: 'Gauge for structure metrics',
    labelNames: ['structure', 'status'],
});

import passport from 'passport';
const EveOnlineSsoStrategy = require('passport-eveonline-sso');

const app = express();
const PORT = process.env.PORT || 8000;

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 28080000000 }
}));

// Initialize ESI
new ESI(process.env.CLIENTID!, process.env.SECRETKEY!);

// Configure Eve Online SSO Strategy
const eveSsoStrategy = new EveOnlineSsoStrategy({
    clientID: process.env.CLIENTID,
    secretKey: process.env.SECRETKEY,
    callbackURL: process.env.CALLBACK,
    scope: process.env.SCOPES
}, async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
    await ESI.setUser(accessToken, refreshToken, profile);
    done(null, profile);
});

passport.use(eveSsoStrategy);
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

// Configure routes
app.get('/success', (req: Request, res: Response) => {
    res.send(`Bot is linked to new account successfully with access token - ${ESI.accessToken}`);
});

app.get('/auth', passport.authenticate('eveonline-sso'));

app.get('/auth/callback', passport.authenticate('eveonline-sso', {
    successReturnToOrRedirect: '/success',
    failureRedirect: '/auth'
}));

app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
});

app.get('/', (req: Request, res: Response) => {
    res.sendStatus(200);
});

// Initialize Bot
new Bot(
    process.env.BOTTOKEN!,
    "1222800112724611072",
    "1156222835434459298",
    notificationCounter,
    minFuelStructure,
    structureMetrics
);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
