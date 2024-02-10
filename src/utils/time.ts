export function getMinutesDifference(timestamp1: Date, timestamp2: Date): number {
    const millisecondsDifference = Math.abs(timestamp1.getTime() - timestamp2.getTime());
    const minutesDifference = Math.floor(millisecondsDifference / (1000 * 60));
    return minutesDifference;
}

export function getMinutesDifferenceSigned(timestamp1: Date, timestamp2: Date): number {
    const millisecondsDifference =timestamp1.getTime() - timestamp2.getTime();
    const minutesDifference = Math.floor(millisecondsDifference / (1000 * 60));
    return minutesDifference;
}

export function formatTime(durationInMinutes: number): string {
    if (durationInMinutes < 1) {
      return `Empty`;
    } else if (durationInMinutes < 60) {
      return `${durationInMinutes} Minute${durationInMinutes !== 1 ? 's' : ''}`;
    } else if (durationInMinutes < 1440) {
      const hours = Math.floor(durationInMinutes / 60);
      return `${hours} Hour${hours !== 1 ? 's' : ''}`;
    } else if (durationInMinutes < 10080) { // 7 days in a week
      const days = Math.floor(durationInMinutes / 1440);
      return `${days} Day${days !== 1 ? 's' : ''}`;
    } else {
      const weeks = Math.floor(durationInMinutes / 10080);
      return `${weeks} Week${weeks !== 1 ? 's' : ''}`;
    }
}

export function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
}