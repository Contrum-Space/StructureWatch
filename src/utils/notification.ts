import { Notification } from "../models/ESI";

export function getStructureID(notification: Notification): string | null {
    const match = notification.text.match(/structureID: \&\w+\s+(\d+)/);
    return match ? match[1] : null;
}

export function getEmbedType(notificationType: string): "critical" | "warning" | "normal" {
    const notificationTypes = {
        critical: [
            "StructureDestroyed",
            "StructureUnderAttack",
            "StructureLostArmor",
            "StructureLostShields",
            "StructureImpendingAbandonmentAssetsAtRisk",
            "StructureWentLowPower",
            "StructureServicesOffline"
        ],
        warning: [
            "StructureFuelAlert",
            "StructureServicesOffline",
            "StructuresJobsCancelled",
            "StructuresJobsPaused",
            "StructureReinforcementChanged",
        ]
    };

    const upperCaseType = notificationType.toUpperCase();

    if (notificationTypes.critical.includes(upperCaseType)) {
        return "critical";
    } else if (notificationTypes.warning.includes(upperCaseType)) {
        return "warning";
    } else {
        return "normal";
    }
}