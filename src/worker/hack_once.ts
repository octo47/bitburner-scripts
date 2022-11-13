import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const hostname = ns.args[0].toString()
    await ns.hack(hostname)
    console.log({
        action: "complete",
        op: 'hacking',
        target: hostname
    })

}