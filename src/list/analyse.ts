import { NS, Server } from '@ns'
import { Capacity } from 'coordinate/capacity'
import { Scanner } from 'lib/scanner.js'

export async function main(ns : NS) : Promise<void> {

    interface Grow {
        hostname: string;
        growTimeWithCapacity: number;
        moneyAvailable: number;
        earnings: number;
    }

    interface Hack {
        hostname: string;
        earnings: number;
        hackFraction: number;
        hackThreads: number;
        hackAmount: number;
        hackTime: number;
        security: number[];
    }

    type Action = Grow | Hack

    function analyseHacking(servers: Server[], capacity: Capacity): Action[] {
        const hackable = servers.filter((el) => { 
            return el.hasAdminRights && el.moneyMax > 0
        })

        const grows: Grow[] = []
        const hacks: Hack[] = []
        
       for (let i = 0; i < hackable.length; i++) {
            const server = hackable[i]
            const hostname = server.hostname
    
            const threadsToDouble = ns.growthAnalyze(hostname, 2)
            const growTime = ns.getGrowTime(hostname)
            const growTimeWithCapacity = growTime * threadsToDouble / capacity.totalThreads / 1000 / 60
            // we are going to grow by doubling, pure earnings is exactly the amount
            const earnings = server.moneyAvailable / growTimeWithCapacity 
    
            const growAction: Grow = {
                hostname: server.hostname,
                growTimeWithCapacity: growTimeWithCapacity,
                moneyAvailable: server.moneyAvailable,
                earnings: earnings
            }
            grows.push(growAction)

            const hackFraction = ns.hackAnalyze(hostname)
            if (hackFraction < 0.5 && hackFraction > 0.0) {
                // we are too powerful for this server
                // we only looking into to getting up to a half of money
                // why? because we want to grow in one run by 2x if possible
                const hackThreads = 0.5 / hackFraction
                const hackAmount = server.moneyAvailable * hackFraction * hackThreads
                
                const hackTime = ns.getHackTime(hostname)/1000/60
                const earnings = hackAmount / hackTime
                const security = [
                    ns.getServerMinSecurityLevel(hostname),
                    ns.getServerSecurityLevel(hostname)
                ]

                const hackAction: Hack = { 
                    hostname: server.hostname,
                    earnings: earnings,
                    hackFraction: hackFraction,
                    hackThreads: hackThreads,
                    hackAmount: hackAmount,
                    hackTime: hackTime,
                    security: security
                }
                hacks.push(hackAction)
            }

        }
        grows.sort((a, b) => -(a.earnings - b.earnings))
        grows.forEach((g) => ns.print(g))
        hacks.sort((a, b) => -(a.earnings - b.earnings))
        hacks.forEach((g) => ns.print(g))
        return []
    }

    const servers = new Scanner()
        .scan(ns)
        .hosts
        .map((item) => ns.getServer(item.hostname))


    const capacity = new Capacity(ns, servers)
    analyseHacking(servers, capacity)


}