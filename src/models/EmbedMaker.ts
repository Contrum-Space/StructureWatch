import { Embed } from "discord.js";
import { Notification, Structure } from "./ESI";
import { formatTime, getMinutesDifference } from "../utils/time";
import { padNumber, toProperCase } from "../utils/format";
import { findStructureByID, mapStateToMessage } from "../utils/structures";
import { getEmbedType, getStructureID } from "../utils/notification";

const { EmbedBuilder } = require('discord.js');

export type Highlight_Type = "normal" | "warning" | "critical";

export default class EmbedMaker{
    private static getColor(type: Highlight_Type){
        switch(type){
            case 'normal': return '#50C878';
            case 'warning': return '#FFBF00';
            case 'critical': return '#CC5500';
        }
    }

    public static createStructureEmbed(structure: Structure): Embed{

        const fuelMinutesRemaining = structure.fuel_expires ? getMinutesDifference(new Date(), new Date(structure.fuel_expires)) : 0;

        const status = mapStateToMessage(structure.state);

        let embedType: Highlight_Type = 'normal';

        if(fuelMinutesRemaining < 1){
            embedType = 'critical'
        }
        else if(fuelMinutesRemaining >= 1 && fuelMinutesRemaining < (60*24*3)){
            embedType = 'warning'
        }

        if(status.includes('REINFORCED') || status.includes('ARMOR') || status.includes('HULL') || status === 'unachoring' || status === 'anchoring'){
            embedType = 'critical';
        }

        const embed = new EmbedBuilder()
            .setColor(this.getColor(embedType))
            .setDescription(embedType.toLocaleUpperCase())
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .addFields(
                { name: 'Fuel Remaining', value: formatTime(fuelMinutesRemaining) },
                { name: 'Vulnerability Status', value: status, inline: true },
                { name: 'Reinforce Hours', value: `${padNumber(structure.reinforce_hour,2)}00 ± 0200 hrs` },
            )
            .setTimestamp()
        return embed;
    }

    public static createNotificationEmbed(notification: Notification, structures: Structure[]): Embed | null{

        const structureID = getStructureID(notification);
        const structure = findStructureByID(structures, structureID);

        if(!structure){
            return null;
        }

        const description = toProperCase(notification.type);
        const severity = getEmbedType(notification.type);

        const embed = new EmbedBuilder()
            // .setColor(this.getColor(severity))
            .setDescription(description)
            .setTitle(structure ? structure.name: '-')
            .setThumbnail(structure ? `https://images.evetech.net/types/${structure.type_id}/icon` : 'https://i.pinimg.com/280x280_RS/a0/5c/20/a05c20c71ed955df57f4bbadc9bebc4b.jpg')
            .setTimestamp()
        return embed;
    }

}