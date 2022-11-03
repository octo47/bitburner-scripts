import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const hostname = ns.args[0].toString()

    while (true) {
        ns.printf('Hacking %s', hostname)
        await ns.hack(hostname)     
        await ns.sleep(10000)
    }

}