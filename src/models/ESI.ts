import axios, { AxiosResponse } from "axios";
import fs from 'fs/promises';
import path from "path";
import { sleep } from "../utils/time";

export interface Structure {
    corporation_id: number;
    fuel_expires: string;
    name: string;
    next_reinforce_apply: string;
    next_reinforce_hour: number;
    profile_id: number;
    reinforce_hour: number;
    services: Service[];
    state: string;
    state_timer_end: string;
    state_timer_start: string;
    structure_id: number;
    system_id: number;
    type_id: number;
    unanchors_at: string;
}

export interface Character {
    alliance_id: number;
    birthday: string;
    bloodline_id: number;
    corporation_id: number;
    description: string;
    faction_id: number;
    gender: string;
    name: string;
    race_id: number;
    security_status: number;
    title: string;
}

export interface Service {
    name: string;
    state: string;
}

export interface Notification {
    is_read: boolean;
    notification_id: number;
    sender_id?: number;
    sender_type: string;
    text: string;
    timestamp: string;
    type: string;
}

export default class ESI {
    private static readonly BASE_PATH: string = 'https://esi.evetech.net/latest/';
    private static readonly CORPORATION_ID: string = '98739705';
    private static characterID: string = '';

    private static clientId: string;
    private static secretKey: string;

    public static accessToken: string;
    public static refreshToken: string;

    private static readonly ACCOUNT_FILE: string = path.join(__dirname, '..', '..', 'data', 'account.json');
    public static readonly STRUCTURE_FILE: string = path.join(__dirname, '..', '..', 'data', 'structures.json');

    public static firstRun: boolean = false;
    public static nextAvailableTime: string = "";

    constructor(clientId: string, secretKey: string) {
        ESI.clientId = clientId;
        ESI.secretKey = secretKey;
        ESI.loadUser();
    }

    public static async loadUser(): Promise<void> {
        try {
            const rawData = await fs.readFile(this.ACCOUNT_FILE, 'utf-8');
            const data = JSON.parse(rawData);
            ESI.accessToken = data.accessToken;
            ESI.refreshToken = data.refreshToken;
            ESI.characterID = data.characterID;
            await this.getNewToken();
            console.log('Successfully loaded user from account.json');
        } catch (err) {
            console.log('Unable to load account.json');
        }
    }

    public static async setUser(accessToken: string, refreshToken: string, profile: any): Promise<void> {
        ESI.characterID = profile.CharacterID;
        ESI.accessToken = accessToken;
        ESI.refreshToken = refreshToken;
        await fs.writeFile(ESI.ACCOUNT_FILE, JSON.stringify({ accessToken, refreshToken, characterID: this.characterID }));
    }

    private static async getNewToken(): Promise<void> {
        if (!ESI.refreshToken) return;

        try {
            console.log('Starting token refresh');
            const response = await axios.post(
                'https://login.eveonline.com/v2/oauth/token',
                `grant_type=refresh_token&refresh_token=${encodeURIComponent(ESI.refreshToken)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${ESI.clientId}:${ESI.secretKey}`).toString('base64')}`
                    },
                }
            );

            ESI.accessToken = response.data.access_token;
            console.log('Token refreshed');
        } catch (error: any) {
            console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        }
    }

    public static async getStructureData(): Promise<Structure[]> {
        await this.waitForTokens();
        await this.getNewToken();

        try {
            const structuresResponse = await this.makeAuthenticatedRequest<Structure[]>(
                `corporations/${ESI.CORPORATION_ID}/structures`
            );

            this.updateNextAvailableTime(structuresResponse);
            await this.checkFirstRun();

            return structuresResponse.data;
        } catch (error: any) {
            console.error('Error fetching structure data:', error);
            return [];
        }
    }

    public static async getNotifications(): Promise<Notification[]> {
        await this.waitForTokens();
        await this.getNewToken();

        try {
            const notificationsResponse = await this.makeAuthenticatedRequest<Notification[]>(
                `characters/${ESI.characterID}/notifications`
            );

            return notificationsResponse.data.filter(notif => 
                notif.type.includes('Structure') || notif.type.includes('AllAnchoringMsg')
            );
        } catch (error: any) {
            console.error('Error fetching character notifications:', error);
            return [];
        }
    }

    private static async waitForTokens(): Promise<void> {
        while (!ESI.accessToken || !ESI.characterID) {
            await sleep(2000);
        }
    }

    private static async makeAuthenticatedRequest<T>(endpoint: string): Promise<AxiosResponse<T>> {
        return axios.get<T>(`${ESI.BASE_PATH}${endpoint}`, {
            headers: {
                "Authorization": `Bearer ${ESI.accessToken}`
            }
        });
    }

    private static updateNextAvailableTime(response: AxiosResponse): void {
        const expiresHeader = response.headers['expires'];
        if (expiresHeader) {
            ESI.nextAvailableTime = expiresHeader;
        }
    }

    private static async checkFirstRun(): Promise<void> {
        try {
            await fs.access(this.STRUCTURE_FILE);
            this.firstRun = false;
        } catch (err) {
            this.firstRun = true;
            console.log('This is the first run.');
        }
    }
}