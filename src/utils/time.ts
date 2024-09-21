const MILLISECONDS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 10080;

export function getMinutesDifference(timestamp1: Date, timestamp2: Date): number {
    return Math.floor(Math.abs(timestamp1.getTime() - timestamp2.getTime()) / MILLISECONDS_PER_MINUTE);
}

export function getMinutesDifferenceSigned(timestamp1: Date, timestamp2: Date): number {
    return Math.floor((timestamp1.getTime() - timestamp2.getTime()) / MILLISECONDS_PER_MINUTE);
}

export function formatTime(durationInMinutes: number): string {
    if (durationInMinutes < 1) return 'Empty';

    const formatUnit = (value: number, unit: string) => 
        `${value} ${unit}${value !== 1 ? 's' : ''}`;

    if (durationInMinutes < MINUTES_PER_HOUR) {
        return formatUnit(durationInMinutes, 'Minute');
    } else if (durationInMinutes < MINUTES_PER_DAY) {
        return formatUnit(Math.floor(durationInMinutes / MINUTES_PER_HOUR), 'Hour');
    } else if (durationInMinutes < MINUTES_PER_WEEK) {
        return formatUnit(Math.floor(durationInMinutes / MINUTES_PER_DAY), 'Day');
    } else {
        return formatUnit(Math.floor(durationInMinutes / MINUTES_PER_WEEK), 'Week');
    }
}

export const sleep = (milliseconds: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, milliseconds));