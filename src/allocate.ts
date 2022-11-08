import { NS } from '@ns'
import { Coordinator } from './coordinate/coordinator'

export async function main(ns : NS) : Promise<void> {
    const coordinator = new Coordinator()

    while(true) {
        await coordinator.runAllocations(ns)
        await ns.sleep(10000)
    }
}