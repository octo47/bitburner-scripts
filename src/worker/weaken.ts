import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const hostname = ns.args[0].toString()

    ns.disableLog('sleep')

    while (true) {
        await ns.weaken(hostname)     
    }

}