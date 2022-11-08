import { NS, Server } from '@ns'
import { Scanner } from 'lib/scanner.js'
import { Capacity } from 'coordinate/capacity.js'
import { Allocator, Allocation, WorkType } from 'coordinate/allocator.js'
import { Grow, Hack } from 'coordinate/types.js'


export class Coordinator {
    
    allocateGrowing(ns: NS, capacity: Capacity, allocator: Allocator, targets: Server[]): Allocation[] {

        const allocations: Allocation[] = []

        const eligable = targets.filter((server) => server.moneyMax > 0 && server.moneyAvailable/server.moneyMax < 0.5)

        const inOrder = eligable.map((target) => {
            const threadsToDouble = ns.growthAnalyze(target.hostname, 2)
            const growTime = ns.getGrowTime(target.hostname)
            const growTimeWithCapacity = growTime * threadsToDouble / capacity.growThreadsMax / 1000 / 60
            const earnings = target.moneyAvailable / growTimeWithCapacity 
            return {
                hostname: target.hostname,
                growTimeWithCapacity: growTimeWithCapacity,
                moneyAvailable: target.moneyAvailable,
                earnings: earnings,
                threads: Math.floor(threadsToDouble)
            } as Grow
        })

        inOrder.sort((a, b) => a.growTimeWithCapacity - b.growTimeWithCapacity)

       for (let idx = 0; idx < inOrder.length; idx++) {
            const grow = inOrder[idx]
            const allocated = allocator.allocate(WorkType.growing, grow.threads, grow.hostname)
            if(allocated.length == 0) {
                break
            }
            allocated.forEach((elem) => allocations.push(elem))
        }
        
        return allocations
    }

    allocateHack(ns: NS, allocator: Allocator, targets: Server[]): Allocation[] {
        const allocations: Allocation[] = []

        const eligable = targets.filter((target) => {
            target.moneyMax > 0 && target.moneyAvailable/target.moneyMax >= 0.5
        })

        const inOrder = eligable.map((target) => {
            const hackFraction = ns.hackAnalyze(target.hostname)
            const hackThreads = 0.5 / hackFraction
            const hackAmount = target.moneyAvailable * hackFraction * hackThreads
            
            const hackTime = ns.getHackTime(target.hostname)/1000/60
            const earnings = hackAmount / hackTime
            const security = [
                ns.getServerMinSecurityLevel(target.hostname),
                ns.getServerSecurityLevel(target.hostname)
            ]

            return { 
                hostname: target.hostname,
                earnings: earnings,
                hackFraction: hackFraction,
                hackThreads: hackThreads,
                hackAmount: hackAmount,
                hackTime: hackTime,
                security: security
            } as Hack
        })

        inOrder.sort((a, b) => a.earnings - b.earnings)

       for (let idx = 0; idx < inOrder.length; idx++) {
            const hack = inOrder[idx]
            const allocated = allocator.allocate(WorkType.hacking, hack.hackThreads, hack.hostname)
            if(allocated.length == 0) {
                break
            }
            allocated.forEach((elem) => allocations.push(elem))
        }
        
        return allocations
    }

    allocateWeaken(ns: NS, allocator: Allocator, targets: Server[]): Allocation[] {
        return []
    }


    async runAllocations(ns: NS): Promise<void> {

        const servers = new Scanner()
            .scan(ns)
            .hosts
            .map((item) => ns.getServer(item.hostname))

        const targets = servers.filter((srv) => srv.hasAdminRights && srv.moneyAvailable > 0)

        const capacity = new Capacity(ns, servers)

        console.log(capacity)

        const allocator = new Allocator(capacity)
 
        const allocations: Allocation[] = []

        this.allocateGrowing(ns, capacity, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateHack(ns, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateWeaken(ns, allocator, targets).forEach((elem) => allocations.push(elem))

        if (allocator.freeCapacity() > 0) {
            // run more growing
            this.allocateGrowing(ns, capacity, allocator, targets).forEach((elem) => allocations.push(elem))
        }

        for (let i = 0; i < allocations.length; i++) {
            const g = allocations[i]
            console.log(g)
            const processes = ns.ps(g.worker)
            if (processes.length > 1) {
                await ns.killall(g.worker)
                console.log("more then 1 process? killing all")
            } else if (processes.length == 1) {
                console.log(processes[0])
                if (processes[0].filename === g.script && 
                    processes[0].args[0] === g.target && 
                    processes[0].threads === g.threads) {
                    console.log("%s already set", g.worker)
                    continue
                }
                console.log("%s killing %s", g.worker, processes[0].filename)
                await ns.scriptKill(processes[0].filename, g.worker)                
            }
            await ns.scp(g.script, g.worker)
            await ns.exec(g.script, g.worker, g.threads, g.target)
            console.log("%s started", g.worker)
        }
    }
}

