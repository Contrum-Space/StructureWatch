import { Client, Embed, GatewayIntentBits, Message, TextChannel } from "discord.js";
import ESI, { Structure } from "./ESI";
import EmbedMaker from "./EmbedMaker";
import fs from 'fs/promises';
import { getMinutesDifference, getMinutesDifferenceSigned, sleep } from "../utils/time";
import path from "path";
import { mapStateToMessage } from "../utils/structures";
import { parseISO } from "date-fns";
import { Notification } from "./ESI";
import { toProperCase } from "../utils/format";
export default class Bot {
    // BOT INFO
    private client: Client<boolean>;
    private botToken: string;
    private ready: boolean = false;

    // CHANNEL INFO
    private structureListChannelID: string;
    private structurePingChannelID: string;

    // MESSAGE INFO
    private structureListMessage: Message<true>[] = [];

    // QUEUES
    private messageQueue: { channelID: string; content: string }[] = [];
    private embedQueue: { channelID: string; embeds: Embed[]; content: string }[] = [];

    // FILES
    private static notificationsFile: string = path.join(__dirname, '..' , '..', 'data', 'notifications.json');
    private static botFile: string = path.join(__dirname, '..' , '..','data', 'bot.json');

    constructor(botToken: string, structureListChannelID: string, structurePingChannelID: string) {
        this.botToken = botToken;
        this.structureListChannelID = structureListChannelID;
        this.structurePingChannelID = structurePingChannelID;

        this.client = new Client({ intents: [GatewayIntentBits.GuildMessages] });
        this.client.login(this.botToken);
        this.registerEventListeners();

        ESI.getNewToken();
        this.startCron();
    }

    public async startCron(){
        while(ESI.accessToken === undefined){
            console.log('waiting for ESI initialization');
            await sleep(2000);
        }

        console.log('ESI Initialized');

        this.updateStructureList();

        setInterval(async () => {
            const currentTime = new Date();
            const nextAvailableTime = new Date(ESI.nextAvailableTime);

            // Calculate the difference between current time and next available time
            const timeDifference = getMinutesDifferenceSigned(nextAvailableTime, currentTime);

            if (timeDifference <= 0) {
                // Run the update only if the current time is close to or past the next available time
                await this.updateStructureList();
            }
        }, (1 * 60 * 1000)); // Check every minute
    }

    public async loadData(){
        try{
            const rawData = await fs.readFile(Bot.botFile, 'utf-8');
            const data = JSON.parse(rawData);
            this.structureListMessage = data.structureListMessage;
            this.ready = true;
            console.log('Successfully loaded data from bot.json');
        }
        catch(err){
            console.log('Unable to load bot.json. probably because this is your first run');
            this.ready = true;
        }
    }

    public async addStructureListMessage(structureListMessage: Message<true>){
        this.structureListMessage.push(structureListMessage);
    }

    private registerEventListeners() {
        this.client.on('ready', async () => {
            console.log(`Logged in as ${this.client.user?.tag}!`);
            this.ready = true;
            this.processMessageQueue();
            this.processEmbedsQueue();
        });
    }

    private async processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { channelID, content } = this.messageQueue.shift()!;
            await this.sendMessage(channelID, content);
        }
    }

    private async processEmbedsQueue() {
        while (this.embedQueue.length > 0) {
            const { channelID, embeds } = this.embedQueue.shift()!;
            await this.sendEmbeds(channelID, embeds);
        }
    }

    public async sendMessage(channelID: string, content: string) {
        if (!this.ready) {
            // If the client is not ready, add the message to the queue
            this.messageQueue.push({ channelID, content });
        } else {
            // If the client is ready, send the message
            const channel = await this.client.channels.fetch(channelID) as TextChannel;
            await channel.send({ content });
        }
    }

    public async sendEmbeds(channelID: string, embeds: Embed[], content :string = "") {
        if (!this.ready) {
            // If the client is not ready, add the embeds to the queue
            this.embedQueue.push({ channelID, embeds, content });
        } else {
            // If the client is ready, send the embeds
            const channel = await this.client.channels.fetch(channelID) as TextChannel;
            const message = await channel.send({ embeds, content });
            this.addStructureListMessage(message);
        }
    }

    public async updateStructureList() {
        const structures = await ESI.getStructureData();
        console.log(structures.length);
        if( structures.length === 0 ){
            console.log('no structures found')
            return;
        }

        const chunkSize = 10;
        const embeds = [];
        
        for (const structure of structures) {
            embeds.push(EmbedMaker.createStructureEmbed(structure));
        }

        if(this.structureListMessage.length !== 0){

        const channel = await this.client.channels.fetch(this.structureListChannelID) as TextChannel;
        for(const message of this.structureListMessage){
            try{
                const oldMessage = await channel.messages.fetch(message.id);
                await oldMessage.delete();
            }
            catch(err: any){
                console.log('error deleting old message: ', err.rawError.message);
            }
        }
        }

        this.structureListMessage = [];
        
        if (embeds.length > 0) {
            for (let i = 0; i < embeds.length; i += chunkSize) {
                const chunk = embeds.slice(i, i + chunkSize);
                this.sendEmbeds(this.structureListChannelID, chunk);
            }
        }
        await fs.writeFile(Bot.botFile, JSON.stringify({structureListMessage: this.structureListMessage}));
        await fs.writeFile(ESI.structureFile, JSON.stringify(structures));

        await this.getStructurePings();

    }

    private async getStructurePings() {
        const notifications = await ESI.getNotifications();


        let firstRun = false;

        try{
            await fs.access(Bot.notificationsFile);
        }
        catch(err){
            // file doesnt exist, create it
            await fs.open(Bot.notificationsFile, 'w');
            firstRun = true;
        }

        let notifsToPing: Notification[] = [];

        if(firstRun){
            // if first run, add every notif to collection
            notifsToPing = []
            await fs.appendFile(Bot.notificationsFile, "\n" + notifications.map(notif => notif.notification_id.toString()).join('\n'));
        }
        else{
            // else only ping those who dont exist in collection
            const notifsAlreadyPinged = (await fs.readFile(Bot.notificationsFile, 'utf-8')).split('\n');
            notifsToPing = notifications.filter(notif => !notifsAlreadyPinged.includes(notif.notification_id.toString()));
            await fs.appendFile(Bot.notificationsFile, "\n" + notifsToPing.map(notif => notif.notification_id.toString()).join('\n'));
        }

        // send pings

        const embedsToPing: Embed[] = [];

        const structures = JSON.parse(await fs.readFile(ESI.structureFile, 'utf-8'));

        for(const notif of notifsToPing){
            const embed = EmbedMaker.createNotificationEmbed(notif, structures)
            if(!embed){
                continue;
            }
            embedsToPing.push(embed);
        }

        
        const chunkSize = 10;
 
        if (embedsToPing.length > 0) {
            for (let i = 0; i < embedsToPing.length; i += chunkSize) {
                const chunk = embedsToPing.slice(i, i + chunkSize);
                this.sendEmbeds(this.structurePingChannelID, chunk, '@everyone\n');
            }
        }
    }
    
}
