import { NS, Server } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const myMoney = (): number => {
        return ns.getPlayer().money
    }
    
    ns.disableLog("sleep")

    while(true) {
        const purchasedServers = ns.getPurchasedServers()
        const maxRam = ns.getPurchasedServerMaxRam()

        let potential = false
 
        for (let i = 0; i < purchasedServers.length; i++) {
            const hostname = purchasedServers[i]
            const pserver: Server = ns.getServer(hostname)
            const targetRam = pserver.maxRam * 2
            if (targetRam > maxRam) {
                continue
            }

            potential = true

            const cost = ns.getPurchasedServerCost(targetRam)
            if (cost < myMoney()) {
                console.log("Upgrading server " + pserver.hostname + " to RAM: " + targetRam)
                ns.killall()
            }
        }

        if (purchasedServers.length < ns.getPurchasedServerLimit()) {
            potential = true
            const cost = ns.getPurchasedServerCost(8)
            if (myMoney() < cost) {
                console.log("Need $" + cost + " . Have $" + myMoney() + " to purchase " + (purchasedServers.length + 1) + "server")
            } else {
                ns.purchaseServer("worker_" + (purchasedServers.length + 1), 8)
            }
        }

        if (!potential) {
            console.log("Nothing can be done for servers, Enjoy!")
            break
        }

        await ns.sleep(180000)
    }

}