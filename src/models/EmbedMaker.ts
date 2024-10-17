import { ColorResolvable, Embed, EmbedBuilder } from "discord.js";
import { Notification, Structure } from "./ESI";
import { formatTime, getMinutesDifference } from "../utils/time";
import { padNumber, toProperCase } from "../utils/format";
import { findStructureByID, mapStateToMessage } from "../utils/structures";
import { getStructureID } from "../utils/notification";

type HighlightType = "normal" | "warning" | "critical";

export default class EmbedMaker {
    private static readonly COLORS: Record<HighlightType, ColorResolvable> = {
        normal: '#50C878',
        warning: '#FFBF00',
        critical: '#CC5500'
    };

    private static getHighlightType(structure: Structure, fuelMinutesRemaining: number): HighlightType {
        const status = mapStateToMessage(structure.state);

        if (fuelMinutesRemaining >= 1 && fuelMinutesRemaining <= (60 * 24 * 3)) {
            return 'critical';
        } else if (fuelMinutesRemaining > (60 * 24 * 3) && fuelMinutesRemaining <= (60 * 24 * 7)) {
            return 'warning';
        }

        if (status.includes('REINFORCED') || status.includes('ARMOR') || status.includes('HULL') || status === 'unachoring' || status === 'anchoring') {
            return 'critical';
        }

        return 'normal';
    }

    public static createStructureEmbed(structure: Structure): EmbedBuilder {
        const fuelMinutesRemaining = structure.fuel_expires ? getMinutesDifference(new Date(), new Date(structure.fuel_expires)) : 0;
        const status = mapStateToMessage(structure.state);
        const highlightType = this.getHighlightType(structure, fuelMinutesRemaining);

        return new EmbedBuilder()
            .setColor(this.COLORS[highlightType])
            .setDescription(highlightType.toUpperCase())
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .addFields(
                { name: 'Fuel Remaining', value: formatTime(fuelMinutesRemaining) },
                { name: 'Vulnerability Status', value: status, inline: true },
                { name: 'Reinforce Hours', value: `${padNumber(structure.reinforce_hour, 2)}00 ± 0200 hrs` },
            )
            .setTimestamp();
    }

    public static createNotificationEmbed(notification: Notification, structures: Structure[]): EmbedBuilder | null {
        const structureID = getStructureID(notification);
        const structure = findStructureByID(structures, structureID);

        // to reduce moon drills spam
        const ignoredNotificationTypes = [
            'StructurePaintPurchased',
            'StructuresJobsCancelled',
            'StructuresJobsPaused',
            'StructureItemsDelivered',
            'StructureImpendingAbandonmentAssetsAtRisk',
        ];

        const ignoredMoonDrillNotificationTypes =  [
            'StructureNoReagentsAlert',
            'StructureLowReagentsAlert',
            'AllAnchoringMsg',
            'StructureAnchoring',
            'StructureUnanchoring',
        ];

        const isRefineryStructure = structure?.type_id === 81826;
        const isIgnoredNotificationType = ignoredNotificationTypes.includes(notification.type);

        if (!structure || (isRefineryStructure && ignoredMoonDrillNotificationTypes) || isIgnoredNotificationType) {
            return null;
        }

        const embed = new EmbedBuilder()
            .setDescription(toProperCase(notification.type))
            .setTitle(structure.name)
            .setThumbnail(`https://images.evetech.net/types/${structure.type_id}/icon`)
            .setTimestamp(new Date(notification.timestamp));

        return embed;
    }
}