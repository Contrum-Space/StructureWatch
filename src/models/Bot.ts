import { Client, Embed, GatewayIntentBits, Message, TextChannel } from "discord.js";
import ESI, { Structure } from "./ESI";
import EmbedMaker from "./EmbedMaker";
import fs from 'fs/promises';
import { getMinutesDifference, getMinutesDifferenceSigned, sleep } from "../utils/time";
import path from "path";
import { mapStateToMessage } from "../utils/state";

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
    private embedQueue: { channelID: string; embeds: Embed[] }[] = [];

    private static botFile: string = path.join(__dirname, '..' , '..','data', 'bot.json');

    constructor(botToken: string, structureListChannelID: string, structurePingChannelID: string) {
        this.botToken = botToken;
        this.structureListChannelID = structureListChannelID;
        this.structurePingChannelID = structurePingChannelID;

        this.client = new Client({ intents: [GatewayIntentBits.GuildMessages] });
        this.client.login(this.botToken);
        this.registerEventListeners();

        this.startCron();
    }

    public async startCron(){
        while(ESI.accessToken === undefined){
            console.log('waiting for ESI initialization');
            await sleep(2000);
        }

        this.loadData();
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
            this.embedQueue.push({ channelID, embeds });
        } else {
            // If the client is ready, send the embeds
            const channel = await this.client.channels.fetch(channelID) as TextChannel;
            const message = await channel.send({ embeds });
            this.addStructureListMessage(message);
        }
    }

    public async updateStructureList() {
        const structures = await ESI.getStructureData();
        await this.getStructurePings(structures);

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

    }

    public async getStructurePings(structures: Structure[]) {

        let data = [];

        if(!ESI.firstRun){
        const rawData = await fs.readFile(ESI.structureFile, 'utf-8');
        data = JSON.parse(rawData);
        }
    
        const messages: Embed[] = [];
    
        for (const newStructure of structures) {
            const oldStructure = data.find((s: Structure) => s.structure_id === newStructure.structure_id);
    
            if(oldStructure === undefined){
                const embed = EmbedMaker.createNewStructureEmbed(newStructure);
                messages.push(embed);
            }
            else{
                if(ESI.firstRun === true){
                    if(newStructure.state!=='shield_vulnerable'){
                        const embed = EmbedMaker.createStatusEmbed(newStructure);
                        messages.push(embed);
                    }

                    const fuelMinutesRemaining = newStructure.fuel_expires ? getMinutesDifference(new Date(), new Date(newStructure.fuel_expires)) : 0;
            
                    if (fuelMinutesRemaining < 1) {
                        const embed = EmbedMaker.createFuelEmbed(newStructure);
                        messages.push(embed);
                    } else if (fuelMinutesRemaining < (60 * 24 * 3)) {
                        const embed = EmbedMaker.createFuelEmbed(newStructure);
                        messages.push(embed);
                    }
                }
            
                else{

                    if ((oldStructure.state !== newStructure.state)) {
                        const embed = EmbedMaker.createStatusChangeEmbed(newStructure, oldStructure);
                        messages.push(embed);
                    }
            
                    const fuelMinutesRemaining = newStructure.fuel_expires ? getMinutesDifference(new Date(), new Date(newStructure.fuel_expires)) : 0;
            
                    if (
                        fuelMinutesRemaining < 1 && 
                        getMinutesDifference(new Date(), new Date(oldStructure.fuel_expires)) > 1) {
                        const embed = EmbedMaker.createFuelEmbed(newStructure);
                        messages.push(embed);
                    } else if (
                        fuelMinutesRemaining < 60 * 24 * 3 &&
                        getMinutesDifference(new Date(), new Date(oldStructure.fuel_expires)) >= 60 * 24 * 3) {
                        const embed = EmbedMaker.createFuelEmbed(newStructure);
                        messages.push(embed);
                    }
                }
            }

        }
        
        if (messages.length > 0) {
            const chunkSize = 10;
            for (let i = 0; i < messages.length; i += chunkSize) {
                const chunk = messages.slice(i, i + chunkSize);
                this.sendEmbeds(this.structurePingChannelID, chunk,  i == 0 ? "@everyone" : "");
            }
        }
    }
    
}
