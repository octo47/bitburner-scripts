
export interface Grow {
    hostname: string;
    threads: number;
    growTime: number;
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

export interface Weaken {
    hostname: string;
    amount: number;
    threads: number;
    time: number;
    perMinue: number;
    security: number[];
}

