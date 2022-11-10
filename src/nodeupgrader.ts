import { NS } from '@ns'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns : NS) : Promise<void> {
    const myMoney = (): number => {
        return ns.getPlayer().money
    }
    
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    
    const hacknet = ns.hacknet

    const nodes = 30
    const cores = 8
    const ram = 8
    const level = 120
    
    
    while(true) {
        while(hacknet.numNodes() < nodes) {
            const cost = hacknet.getPurchaseNodeCost()
            if (myMoney() < cost) {
                console.log("Need $" + cost + " . Have $" + myMoney())
                break
            }
            const res = await hacknet.purchaseNode()
            console.log("Purchased hacknet Node with index " + res)
        }
        
        for (let i = 0; i < hacknet.numNodes(); i++) {
            if (hacknet.getNodeStats(i).level <= level) {
                const cost = hacknet.getLevelUpgradeCost(i, 10)
                if (myMoney() < cost) {
                    console.log("Need $" + cost + " . Have $" + myMoney())
                    break
                }
                await hacknet.upgradeLevel(i, 10)
                console.log("Upgraded hacknet Node level with index " + i)
            }
        }
        
        for (let i = 0; i < hacknet.numNodes(); i++) {
            while (hacknet.getNodeStats(i).ram < ram) {
                const cost = hacknet.getRamUpgradeCost(i, 2)
                if (myMoney() < cost) {
                    console.log("Need $" + cost + " . Have $" + myMoney())
                    break
                }
                await hacknet.upgradeRam(i, 2)
                console.log("Upgraded hacknet Node ram with index " + i)
            }
        }
        
        for (let i = 0; i < hacknet.numNodes(); i++) {
            while (hacknet.getNodeStats(i).cores < cores) {
                const cost = hacknet.getCoreUpgradeCost(i, 1)
                if (myMoney() < cost) {
                    console.log("Need $" + cost + " . Have $" + myMoney())
                    break
                }
                await hacknet.upgradeCore(i, 1)
                console.log("Upgraded hacknet Node cores with index " + i)
            }
        }
        await ns.sleep(180000)
    }

}