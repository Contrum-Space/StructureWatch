import { Notification } from "../models/ESI";

export function getStructureID(notification: Notification): string | null {
    const match = notification.text.match(/structureID: \&\w+\s+(\d+)/);
    if (match) {
      return match[1]; // Access the captured ID (group 1)
    }
    return null;
}

export function getEmbedType(notificationType: string){
    const criticalNotifications = [
        "StructureDestroyed",
        "StructureUnderAttack",
        "StructureLostArmor",
        "StructureLostShields",
        "StructureImpendingAbandonmentAssetsAtRisk",
        "StructureWentLowPower",
        "StructureServicesOffline"
      ];
      const warningNotifications = [
        "StructureFuelAlert",
        "StructureServicesOffline",
        "StructuresJobsCancelled",
        "StructuresJobsPaused",
        "StructureReinforcementChanged",
      ];
    
      notificationType = notificationType.toUpperCase(); // Ensure case-insensitive matching
    
      if (criticalNotifications.includes(notificationType)) {
        return "critical";
      } else if (warningNotifications.includes(notificationType)) {
        return "warning";
      } else {
        return "normal";
      }
}