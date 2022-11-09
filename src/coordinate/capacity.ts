import { NS, Server } from '@ns'

export class Capacity {
    totalThreads: number;

    workers: Map<string, number> = new Map<string, number>()

    constructor(ns: NS, servers: Server[]) {
        this.totalThreads = 0
        const scriptRam = 1.8
        servers.forEach((worker) => {
            if (worker.hasAdminRights && worker.maxRam > 0) {
                const threads = Math.floor(worker.maxRam / scriptRam)
                this.workers.set(worker.hostname, threads)
                this.totalThreads += threads
            }
        })
    }
}
