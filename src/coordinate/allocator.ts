import { Capacity } from 'coordinate/capacity' 

export enum WorkType {
    any,
    hacking,
    weaking,
    growing 
}

export interface Allocation {
    worker: string;
    target: string;
    script: string;
    threads: number;
}

const workerGrow = "/worker/grow.js"
const workerHack = "/worker/hack.js"
const workerWeaken = "/worker/weaken.js"


export class Allocator {

    capacity: Capacity

    constructor(capacity: Capacity) {
        this.capacity = capacity
    }

    freeCapacity(): number {
        let reminder = 0

        this.capacity.workers.forEach(val => {
            reminder += val
        })
        return reminder
    }

    allocate(type: WorkType, maxThreads: number, target: string): Allocation[] {

        const allocations: Allocation[] = []

        let toAllocate = this.availableThreads(type, maxThreads)
        if (!toAllocate) {
            return allocations
        }
        console.log("Allocating %s for %s: maxThreads=%d => %d", this.scriptName(type), target, maxThreads, toAllocate)

        for (const entry of Array.from(this.capacity.workers.entries())) {
            const hostname = entry[0]
            const available = entry[1]

            if (!available) {
                this.capacity.workers.delete(hostname)
                continue
            }
            const allocated = Math.min(available, toAllocate)
            this.capacity.workers.set(hostname, available - allocated)
            toAllocate -= allocated
            this.allocateThreads(type, allocated)

            allocations.push({
                worker: hostname,
                target: target,
                script: this.scriptName(type),
                threads: allocated
            } as Allocation)

            if (toAllocate == 0) {
                break
            }
        }
        return allocations
    }

    private availableThreads(type: WorkType, maxThreads: number): number | undefined {
        switch(type) {
            case WorkType.hacking: return Math.min(this.capacity.hackThreadsMax, Math.floor(maxThreads))
            case WorkType.growing: return Math.min(this.capacity.growThreadsMax, Math.floor(maxThreads))
            case WorkType.weaking: return Math.min(this.capacity.weakenThreadsMax, Math.floor(maxThreads))
            default: return undefined
        }
    }

    private allocateThreads(type: WorkType, threads: number): void {
        switch(type) {
            case WorkType.hacking: this.capacity.hackThreadsMax -= threads
            case WorkType.growing: this.capacity.growThreadsMax -= threads
            case WorkType.weaking: this.capacity.weakenThreadsMax -= threads
        }
    }

    private scriptName(type: WorkType): string {
        switch(type) {
            case WorkType.hacking: return workerHack
            case WorkType.growing: return workerGrow
            case WorkType.weaking: return workerWeaken
            default: return ""
        }
    }

}

