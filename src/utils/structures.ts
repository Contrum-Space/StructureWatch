import { Structure } from "../models/ESI";

enum StructureState {
    ANCHOR_VULNERABLE = 'VULNERABLE [ANCHOR]',
    ANCHORING = 'ANCHORING',
    ARMOR_REINFORCE = 'REINFORCED [ARMOR]',
    ARMOR_VULNERABLE = 'VULNERABLE [ARMOR]',
    DEPLOY_VULNERABLE = 'VULNERABLE [DEPLOY]',
    FITTING_INVULNERABLE = 'INVULNERABLE [FITTING]',
    HULL_REINFORCE = 'REINFORCED [HULL]',
    HULL_VULNERABLE = 'VULNERABLE [HULL]',
    ONLINE_DEPRECATED = 'ONLINE [DEPRECATED]',
    ONLINING_VULNERABLE = 'VULNERABLE [ONLINING]',
    SHIELD_VULNERABLE = 'VULNERABLE [SHIELD]',
    UNANCHORED = 'UNANCHORED',
    UNKNOWN = 'UNKNOWN'
}

export function mapStateToMessage(state: string): string {
    return Object.values(StructureState).includes(state as StructureState)
        ? state
        : StructureState.UNKNOWN;
}

export function findStructureByID(structures: Structure[], structureID: string | null): Structure | undefined {
    if (!structureID) {
        return undefined;
    }
    return structures.find(structure => structure.structure_id.toString() === structureID);
}