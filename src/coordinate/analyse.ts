import { NS, Server } from '@ns'
import { Scanner } from '/lib/scanner.js'

export async function main(ns : NS) : Promise<void> {

    interface Capacity {
        totalRam: number;
        totalThreads: number;
        scriptRam: number;
    }

    interface Grow {
        hostname: string;
        growTimeWithCapacity: number;
        moneyAvailable: number;
        earnings: number;
    }

    interface Hack {
        hostname: string;
        hackAmount: number;
        hackTime: number;
        hackForSure: number;
    }

    type Action = Grow | Hack

    function analyseCapacity(servers: Server[]): Capacity {
        const workers = servers.filter((el) => { 
            return el.hasAdminRights
        })

        const totalRam = workers.map((server) => server.maxRam).reduce((accum, val) => accum + val, 0)
        const scriptRam = ns.getScriptRam("/worker/hack.js", "home")
        const totalThreads = totalRam / scriptRam

        const capacity = {
            totalRam: totalRam,
            totalThreads: totalThreads,
            scriptRam: scriptRam
        }

        console.log(capacity)
        return capacity
    }

    function analyseHacking(servers: Server[], capacity: Capacity): Action[] {
        const hackable = servers.filter((el) => { 
            return el.hasAdminRights && el.moneyMax > 0
        })

        const grows: Grow[] = []
        const hacks: Hack[] = []
        
        const wa = ns.weakenAnalyze(1)
        for (let i = 0; i < hackable.length; i++) {
            const server = hackable[i]
            const hostname = server.hostname
            const money = server.moneyAvailable
            const moneyMax = server.moneyMax
    
            if (server.moneyAvailable / moneyMax < 0.5) {
                const threadsToDouble = ns.growthAnalyze(hostname, 2)
                const growTime = ns.getGrowTime(hostname)
                const growTimeWithCapacity = growTime * threadsToDouble / capacity.totalThreads / 1000 / 60
                // we are going to grow by doubling, pure earnings is exactly the amount
                const earnings = server.moneyAvailable / growTimeWithCapacity 
        
                const action: Grow = {
                    hostname: server.hostname,
                    growTimeWithCapacity: growTimeWithCapacity,
                    moneyAvailable: server.moneyAvailable,
                    earnings: earnings
                }
                grows.push(action)
            } else {
                const hackFraction = ns.hackAnalyze(hostname)
                const hackAmount = hackFraction*money
                const hackTime = ns.getHackTime(hostname)/1000/60
                const hackChance = ns.hackAnalyzeChance(hostname)
                const hackForSure = hackAmount * hackChance
    
                const action: Hack = { 
                    hostname: server.hostname,
                    hackAmount: hackAmount,
                    hackTime: hackTime,
                    hackForSure: hackForSure
                }
                hacks.push(action)
    
            }
        }
        grows.sort((a, b) => -(a.earnings - b.earnings))
        grows.forEach((g) => console.log(g))
        hacks.sort((a, b) => -(a.hackForSure - b.hackForSure))
        hacks.forEach((g) => console.log(g))
        return []
    }

    const servers = new Scanner()
        .scan(ns)
        .hosts
        .map((item) => ns.getServer(item.hostname))


    const capacity = analyseCapacity(servers)
    analyseHacking(servers, capacity)


}