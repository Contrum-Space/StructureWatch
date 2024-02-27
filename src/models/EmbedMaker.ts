import { Embed } from "discord.js";
import { Structure } from "./ESI";
import { formatTime, getMinutesDifference } from "../utils/time";
import { padNumber } from "../utils/format";
import { mapStateToMessage } from "../utils/state";

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

    public static createNewStructureEmbed(structure: Structure): Embed{

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
            .setDescription("New structure found")
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


    public static createFuelEmbed(structure: Structure): Embed{

        const fuelMinutesRemaining = structure.fuel_expires ? getMinutesDifference(new Date(), new Date(structure.fuel_expires)) : 0;


        const description = fuelMinutesRemaining < 1 ? `${structure.name} is **out of fuel**` : `${structure.name} is **running low on fuel**`;

        let embedType: Highlight_Type = fuelMinutesRemaining < 1 ? 'critical': 'warning';

        const embed = new EmbedBuilder()
            .setColor(this.getColor(embedType))
            .setDescription(description)
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .addFields(
                { name: 'Fuel Remaining', value: formatTime(fuelMinutesRemaining) },
            )
            .setTimestamp()
        return embed;
    }

    public static createStatusEmbed(structure: Structure): Embed{
        let embedType: Highlight_Type = structure.state !== 'shield_vulnerable' ? 'critical': 'normal';

        if(structure.state === 'anchoring' || structure.state === 'unachoring'){
            embedType = 'warning';
        }

        const embed = new EmbedBuilder()
            .setColor(this.getColor(embedType))
            .setDescription(`${structure.name} is ${mapStateToMessage(structure.state)}`)
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .setTimestamp()
        return embed;
    }

    public static createStatusChangeEmbed(structure: Structure, oldStructure: Structure): Embed{
        let embedType: Highlight_Type = structure.state !== 'shield_vulnerable' ? 'critical': 'normal';

        if(structure.state === 'anchoring' || structure.state === 'unachoring'){
            embedType = 'warning';
        }

        const embed = new EmbedBuilder()
            .setColor(this.getColor(embedType))
            .setDescription(`${structure.name} is now ${mapStateToMessage(structure.state)}`)
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .addFields(
                { name: 'Previous State', value: mapStateToMessage(oldStructure.state)},
            )
            .setTimestamp()
        return embed;
    }
}