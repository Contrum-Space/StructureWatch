import axios from "axios";
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
    services: Structure[];
    state: string;
    state_timer_end: string;
    state_timer_start: string;
    structure_id: number;
    system_id: number;
    type_id: number;
    unanchors_at: string;
}

export interface Structure {
    name: string;
    state: string;
}


export default class ESI{
    private static basePath: string = 'https://esi.evetech.net/latest/';
    private static corporationID: string = '98739705';

    // ESI Keys
    private static clientId: string;
    private static secretKey: string;

    // Character tokens
    public static accessToken: string;
    public static refreshToken: string;

    // Account file
    private static accountFile: string = path.join(__dirname, '..' , '..', 'data', 'account.json');

    // Structure file
    public static structureFile: string = path.join(__dirname, '..' , '..', 'data', 'structures.json');

    public static firstRun: boolean = false;
    public static nextAvailableTime: string = "";

    constructor(clientId: string, secretKey: string){
        ESI.clientId = clientId;
        ESI.secretKey = secretKey;
        ESI.loadUser();
    }

    public static async loadUser(){
        try{
        const rawData = await fs.readFile(this.accountFile, 'utf-8');
        const data = JSON.parse(rawData);
        ESI.accessToken = data.accessToken;
        ESI.refreshToken = data.refreshToken;
        await this.getNewToken();
        console.log('successfully loaded user from account.json');
        }
        catch(err){
            console.log('unable to load account.json')
        }
    }

    public static async setUser(accessToken: string, refreshToken: string){
        ESI.accessToken = accessToken;
        ESI.refreshToken = refreshToken;
        await fs.writeFile(ESI.accountFile, JSON.stringify({accessToken, refreshToken}));
    }

    static async getNewToken(){
        try {
            console.log('starting token refresh');
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
    
            // Update the user object with the new access token
            ESI.accessToken = response.data.access_token;
            console.log('Token refreshed');
        } catch (error: any) {
            console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        }
    }

    public static async getStructureData(): Promise<Structure[]> {
        try {
            while(ESI.accessToken === undefined){
                // wait to load esi tokens
                await(sleep(2000));
            }

            await this.getNewToken()
            // Fetch system kills data
            const structuresResponse = await axios.get<Structure[]>(
                `${ESI.basePath}corporations/${ESI.corporationID}/structures`,{
                headers:{
                    "Authorization": `Bearer ${ESI.accessToken}`
                }}
            );

             // Extract and store the next available time from the 'Expires' header
             const expiresHeader = structuresResponse.headers['expires'];
             if (expiresHeader) {
                
                 ESI.nextAvailableTime = expiresHeader;
             }

            try{
                await fs.access(this.structureFile);
                this.firstRun = false;
            }
            catch(err){
                // file doesnt exist so this is first run
                this.firstRun = true;
                console.log('This is the first run.');
            }


            return structuresResponse.data
        } catch (error: any) {
            console.error('Error fetching structure data:', error);
            return [];
        }
    }
}