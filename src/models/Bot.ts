import { Client, Embed, EmbedBuilder, GatewayIntentBits, Message, TextChannel } from "discord.js";
import ESI, { Structure, Notification } from "./ESI";
import EmbedMaker from "./EmbedMaker";
import fs from 'fs/promises';
import { getMinutesDifferenceSigned, sleep } from "../utils/time";
import path from "path";

export default class Bot {
    private client: Client<boolean>;
    private botToken: string;
    private ready: boolean = false;
    private structureListChannelID: string;
    private structurePingChannelID: string;

    private structureListMessages: Message<true>[] = [];
    private messageQueue: { channelID: string; content: string }[] = [];
    private embedQueue: { channelID: string; embeds: EmbedBuilder[]; content: string }[] = [];

    private static readonly NOTIFICATIONS_FILE: string = path.join(__dirname, '..', '..', 'data', 'notifications.json');
    private static readonly BOT_FILE: string = path.join(__dirname, '..', '..', 'data', 'bot.json');

    constructor(botToken: string, structureListChannelID: string, structurePingChannelID: string) {
        this.client = new Client({ intents: [GatewayIntentBits.GuildMessages] });
        this.botToken = botToken;
        this.structureListChannelID = structureListChannelID;
        this.structurePingChannelID = structurePingChannelID;

        this.initializeClient();
        this.initializeESI();
    }

    private initializeClient() {
        this.client = new Client({ intents: [GatewayIntentBits.GuildMessages] });
        this.client.login(this.botToken);
        this.registerEventListeners();
    }

    private initializeESI() {
        ESI.getNewToken();
        this.startCron();
    }

    private async startCron() {
        await this.waitForESIInitialization();
        await this.updateStructureList();
        this.scheduleUpdates();
    }

    private async waitForESIInitialization() {
        while (ESI.accessToken === undefined) {
            console.log('Waiting for ESI initialization');
            await sleep(2000);
        }
        console.log('ESI Initialized');
    }

    private scheduleUpdates() {
        this.scheduleStructureListUpdates();
        this.scheduleStructurePings();
    }

    private scheduleStructureListUpdates() {
        setInterval(this.checkAndUpdateStructureList.bind(this), 60000); // Check every minute
    }

    private async checkAndUpdateStructureList() {
        const currentTime = new Date();
        const nextAvailableTime = new Date(ESI.nextAvailableTime);
        const timeDifference = getMinutesDifferenceSigned(nextAvailableTime, currentTime);

        if (timeDifference <= 0) {
            await this.updateStructureList();
        }
    }

    private scheduleStructurePings() {
        setInterval(this.getStructurePings.bind(this), 300000); // Check every 5 minutes
    }

    public async loadData() {
        try {
            const rawData = await fs.readFile(Bot.BOT_FILE, 'utf-8');
            const data = JSON.parse(rawData);
            this.structureListMessages = data.structureListMessage;
            this.ready = true;
            console.log('Successfully loaded data from bot.json');
        } catch (err) {
            console.log('Unable to load bot.json. Probably because this is your first run');
            this.ready = true;
        }
    }

    public async addStructureListMessage(structureListMessage: Message<true>) {
        this.structureListMessages.push(structureListMessage);
    }

    private registerEventListeners() {
        this.client.on('ready', this.onClientReady.bind(this));
    }

    private async onClientReady() {
        console.log(`Logged in as ${this.client.user?.tag}!`);
        this.ready = true;
        await this.processQueues();
    }

    private async processQueues() {
        await this.processMessageQueue();
        await this.processEmbedsQueue();
    }

    private async processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { channelID, content } = this.messageQueue.shift()!;
            await this.sendMessage(channelID, content);
        }
    }

    private async processEmbedsQueue() {
        while (this.embedQueue.length > 0) {
            const { channelID, embeds, content } = this.embedQueue.shift()!;
            await this.sendEmbeds(channelID, embeds, content);
        }
    }

    public async sendMessage(channelID: string, content: string) {
        if (!this.ready) {
            this.messageQueue.push({ channelID, content });
        } else {
            const channel = await this.client.channels.fetch(channelID) as TextChannel;
            await channel.send({ content });
        }
    }

    public async sendEmbeds(channelID: string, embeds: EmbedBuilder[], content: string = "") {
        if (embeds.length === 0) return;
        if (!this.ready) {
            this.embedQueue.push({ channelID, embeds, content });
        } else {
            const channel = await this.client.channels.fetch(channelID) as TextChannel;
            const message = await channel.send({ embeds, content });
            await this.addStructureListMessage(message);
        }
    }

    public async updateStructureList() {
        const structures = await ESI.getStructureData();
        if (structures.length === 0) {
            console.log('No structures found');
            return;
        }

        const embeds = structures.map(structure => EmbedMaker.createStructureEmbed(structure));
        await this.deleteOldStructureMessages();
        await this.sendStructureEmbeds(embeds);
        await this.saveStructureData(structures);
        await this.getStructurePings();
    }

    private async deleteOldStructureMessages() {
        const channel = await this.client.channels.fetch(this.structureListChannelID) as TextChannel;
        
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 });
            await channel.bulkDelete(fetched);
        } while (fetched.size >= 2);

        this.structureListMessages = [];
    }

    private async sendStructureEmbeds(embeds: EmbedBuilder[]) {
        const chunkSize = 10;
        for (let i = 0; i < embeds.length; i += chunkSize) {
            const chunk = embeds.slice(i, i + chunkSize);
            await this.sendEmbeds(this.structureListChannelID, chunk);
        }
    }

    private async saveStructureData(structures: Structure[]) {
        await fs.writeFile(Bot.BOT_FILE, JSON.stringify({ structureListMessage: this.structureListMessages }));
        await fs.writeFile(ESI.structureFile, JSON.stringify(structures));
    }

    private async getStructurePings() {
        const notifications = await ESI.getNotifications();
        const firstRun = await this.checkFirstRun();
        const notifsToPing = await this.getNotificationsToPing(notifications, firstRun);
        await this.sendNotificationPings(notifsToPing);
    }

    private async checkFirstRun(): Promise<boolean> {
        try {
            await fs.access(Bot.NOTIFICATIONS_FILE);
            return false;
        } catch (err) {
            await fs.open(Bot.NOTIFICATIONS_FILE, 'w');
            return true;
        }
    }

    private async getNotificationsToPing(notifications: Notification[], firstRun: boolean): Promise<Notification[]> {
        if (firstRun) {
            await this.saveNotifications(notifications);
            return [];
        } else {
            return this.filterAndSaveNewNotifications(notifications);
        }
    }

    private async saveNotifications(notifications: Notification[]) {
        const notificationIds = notifications.map(notif => notif.notification_id.toString()).join('\n') + '\n';
        await fs.appendFile(Bot.NOTIFICATIONS_FILE, notificationIds);
    }

    private async filterAndSaveNewNotifications(notifications: Notification[]): Promise<Notification[]> {
        const notifsAlreadyPinged = (await fs.readFile(Bot.NOTIFICATIONS_FILE, 'utf-8')).split('\n');
        const notifsToPing = notifications.filter(notif => !notifsAlreadyPinged.includes(notif.notification_id.toString()));
        await this.saveNotifications(notifsToPing);
        return notifsToPing;
    }

    private async sendNotificationPings(notifsToPing: Notification[]) {
        const structures: Structure[] = JSON.parse(await fs.readFile(ESI.structureFile, 'utf-8'));
        const embedsToPing = notifsToPing
            .map(notif => EmbedMaker.createNotificationEmbed(notif, structures))
            .filter(embed => embed !== null);

        const chunkSize = 10;
        for (let i = 0; i < embedsToPing.length; i += chunkSize) {
            const chunk: EmbedBuilder[] = (embedsToPing as EmbedBuilder[]).slice(i, i + chunkSize);
            await this.sendEmbeds(this.structurePingChannelID, chunk, '@everyone\n');
        }
    }
}
