
export interface Grow {
    hostname: string;
    growTimeWithCapacity: number;
    threads: number;
    moneyAvailable: number;
    earnings: number;
}

export interface Hack {
    hostname: string;
    earnings: number;
    hackFraction: number;
    hackThreads: number;
    hackAmount: number;
    hackTime: number;
    security: number[];
}

