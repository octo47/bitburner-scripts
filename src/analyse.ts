import { NS, Server } from '@ns'
import { HostList } from './lib/hostdata'

interface Calculated {
    amount: number;
    timeToHack: number;
    growth?: GrowthStats;
}

interface GrowthStats {
    threadsToGrow: number;
    timeToDouble: number;
    earnings: number;
}

export async function main(ns : NS) : Promise<void> {
    const hostPaths = HostList.load(ns)

    const hackedHosts = hostPaths.hosts.filter((el) => { 
        return el.hacked && el.maxMoney > 0 
    })
    
    const servers = hackedHosts.map((el) => { 
            return ns.getServer(el.hostname)
        })

    const toGrowServers = servers.filter((el) => { return el.moneyAvailable / el.moneyMax < 0.5 })

    console.log("To grow: %s", toGrowServers.map((el) => { return el.hostname }).join(', '))

    const wa = ns.weakenAnalyze(1)
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i]
        const hostname = server.hostname
        const money = server.moneyAvailable
        const moneyMax = server.moneyMax

        const hackFraction = ns.hackAnalyze(hostname)
        const hackAmount = hackFraction*money
        const hackTime = ns.getHackTime(hostname)/1000/60
        const hackChance = ns.hackAnalyzeChance(hostname)
        const hackForSure = hackAmount * hackChance
        const tth = moneyMax / 2 / hackForSure * hackTime

        const threadsToDouble = ns.growthAnalyze(hostname, 2)
        const growTime = ns.getGrowTime(hostname) /1000/60
        // we are going to grow by doubling, pure earnings is exactly the amount
        const earningByThread = server.moneyAvailable / growTime

        const calculated: Calculated = {
            amount: hackForSure,
            timeToHack: tth,
            growth: {
                threadsToGrow: threadsToDouble,
                timeToDouble: growTime,
                earnings: earningByThread
            }
        }

        console.log(hostname, calculated)
    }
}