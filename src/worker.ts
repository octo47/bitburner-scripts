import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const hostname: string = ns.args[0] as string

    while(true) {
        while(ns.getServerSecurityLevel(hostname)  > ns.getServerMinSecurityLevel(hostname)) {
            await ns.weaken(hostname)
        }
        while(ns.getServerMoneyAvailable(hostname)  < ns.getServerMaxMoney(hostname)) {
            await ns.grow(hostname)
        }
        ns.sleep(3000)
    }

}