import { NS } from '@ns'
import { HostList } from '../lib/hostdata'

export async function main(ns : NS) : Promise<void> {
    const hostPaths = HostList.load(ns)

    const hackedHosts = hostPaths.hosts.filter((el) => { 
        return el.hacked && !el.owned
    })
    
    const servers = hackedHosts.map((el) => { 
            return ns.getServer(el.hostname)
        }).filter((h) => h.moneyMax > 0)

    const wa = ns.weakenAnalyze(1)
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i]
        const hostname = server.hostname
        const money = server.moneyAvailable
        const moneyMax = server.moneyMax

        if (server.moneyAvailable / moneyMax < 0.5) {
            const threadsToDouble = ns.growthAnalyze(hostname, 2)
            const growTime = ns.getGrowTime(hostname) /1000/60
            // we are going to grow by doubling, pure earnings is exactly the amount
            const earningByThread = server.moneyAvailable / growTime
    
            console.log(hostname, {
                threadsToDouble: threadsToDouble,
                growTime: growTime,
                earningByThread: earningByThread
            })
        } else {
            const hackFraction = ns.hackAnalyze(hostname)
            const hackAmount = hackFraction*money
            const hackTime = ns.getHackTime(hostname)/1000/60
            const hackChance = ns.hackAnalyzeChance(hostname)
            const hackForSure = hackAmount * hackChance

            console.log(hostname, { 
                hackAmount: hackAmount,
                hackTime: hackTime,
                hackForSure: hackForSure
            })

        }
    }
}