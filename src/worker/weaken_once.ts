import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const hostname = ns.args[0].toString()
    await ns.weaken(hostname)     
    console.log({
        action: "complete",
        op: 'weaken',
        target: hostname
    })
}