type StateMapping = {
    [key: string]: string;
};

export function mapStateToMessage(state: string): string {
    const stateMap: StateMapping = {
        anchor_vulnerable: 'VULNERABLE [ANCHOR]',
        anchoring: 'ANCHORING',
        armor_reinforce: 'REINFORCED [ARMOR]',
        armor_vulnerable: 'VULNERABLE [ARMOR]',
        deploy_vulnerable: 'VULNERABLE [DEPLOY]',
        fitting_invulnerable: 'INVULNERABLE [FITTING]',
        hull_reinforce: 'REINFORCED [HULL]',
        hull_vulnerable: 'VULNERABLE [HULL]',
        online_deprecated: 'ONLINE [DEPRECATED]',
        onlining_vulnerable: 'VULNERABLE [ONLINING]',
        shield_vulnerable: 'VULNERABLE [SHIELD]',
        unanchored: 'UNANCHORED',
        unknown: 'UNKNOWN',
    };

    return stateMap[state] || 'UNKNOWN';
}