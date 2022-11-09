import { NS, Server } from '@ns'
import { Scanner } from 'lib/scanner.js'
import { Allocator, Allocation, WorkType } from 'coordinate/allocator.js'
import { Grow, Hack, Weaken } from 'coordinate/types.js'
import { words } from 'lodash'


export class Coordinator {
    
    allocateGrowing(ns: NS, allocator: Allocator, targets: Server[]): Allocation[] {

        const allocations: Allocation[] = []

        const eligable = targets.filter((server) => server.moneyMax > 0 && server.moneyAvailable < server.moneyMax*0.9)

        //console.log("Allocate growing: %s", eligable.map((elem) => elem.hostname).join(","))

        const inOrder = eligable.map((target) => {
            const earning = target.moneyMax - target.moneyAvailable
            const coeff = target.moneyMax/target.moneyAvailable
            let threads: number
            if (coeff < 2) {
                const threadsToDouble = ns.growthAnalyze(target.hostname, 2)
                threads = Math.floor(threadsToDouble * coeff/2.0)
            } else {
                threads = Math.floor(ns.growthAnalyze(target.hostname, coeff))
            }
            const growTime = ns.getGrowTime(target.hostname) / 1000 / 60
            const earnings = earning / growTime 
            return {
                hostname: target.hostname,
                growTime: growTime,
                earnings: earnings,
                threads: threads
            } as Grow
        })

        inOrder.sort((a, b) => b.earnings - a.earnings)

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
            return target.moneyMax > 0 && 
                ns.hackAnalyze(target.hostname) > 0
        })

        //console.log("Allocate hacking: %s", eligable.map((elem) => elem.hostname).join(","))

        const inOrder = eligable
        .map((target) => {
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

        inOrder.sort((a, b) => b.earnings - a.earnings)

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
        const allocations: Allocation[] = []

        const eligable = targets.filter((target) => {
            return target.moneyMax > 0 && 
               ns.getServerSecurityLevel(target.hostname) > ns.getServerMinSecurityLevel(target.hostname)
        })

        const weakenDecrese = ns.weakenAnalyze(1)

        const inOrder = eligable
        .map((target) => {
            const weakenAmount = ns.getServerSecurityLevel(target.hostname) - ns.getServerMinSecurityLevel(target.hostname)
            const weakenThreads = weakenAmount / weakenDecrese
            const weakenTime = ns.getWeakenTime(target.hostname)
            const weakenPerMinute = weakenAmount / weakenTime
            const security = [
                ns.getServerMinSecurityLevel(target.hostname),
                ns.getServerSecurityLevel(target.hostname)
            ]
             return { 
                hostname: target.hostname,
                amount: weakenAmount,
                threads: weakenThreads,
                time: weakenTime,
                perMinue: weakenPerMinute,
                security: security
            } as Weaken
        })

        inOrder.sort((a, b) => b.amount - a.amount)

        for (let idx = 0; idx < inOrder.length; idx++) {
            const weaken = inOrder[idx]
            const allocated = allocator.allocate(WorkType.weaking, weaken.threads, weaken.hostname)
            if(allocated.length == 0) {
                break
            }
            allocated.forEach((elem) => allocations.push(elem))
        }
        
        return allocations
    }

    async runAllocationsOnWorker(ns: NS, worker: string, scripts: Allocation[]): Promise<void> {

        let toKill = await ns.ps(worker)
        const startable: Allocation[] = []

        for (let i = 0; i < scripts.length; i++) {
            const g = scripts[i]
            const running = toKill.find((proc) => proc.filename === g.script)
            if (running) {
                if (running.filename === g.script && 
                    running.args[0] === g.target && 
                    running.threads === g.threads) {
                    toKill = toKill.filter((proc) => proc.filename !== g.script)
                } else {
                    startable.push(g)
                }
            } else {
                startable.push(g)
            }
        }

        for (let i = 0; i < toKill.length; i++) {
            console.log("%s killing %s", worker, toKill[i].filename)
            await ns.scriptKill(toKill[i].filename, worker)
        }

        for (let i = 0; i < startable.length; i++) {
            const g = startable[i]
            await ns.scp(g.script, g.worker)
            await ns.exec(g.script, g.worker, g.threads, g.target)
            console.log({
                "action": "started",
                "worker": g.worker,
                "started": g.script,
                "threads": g.threads
            })    
        }
    }

    async runAllocations(ns: NS): Promise<void> {

        const servers = new Scanner()
            .scan(ns)
            .hosts
            .map((item) => ns.getServer(item.hostname))

        const targets = servers.filter((srv) => srv.hasAdminRights && srv.moneyAvailable > 0)

        const allocator = new Allocator(ns, servers)
 
        const allocations: Allocation[] = []

        this.allocateGrowing(ns, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateHack(ns, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateWeaken(ns, allocator, targets).forEach((elem) => allocations.push(elem))

        const byWorker: Map<string, Allocation[]> = new Map()

        allocations.forEach((alloc) => {
            const items = byWorker.get(alloc.worker) ?? []
            items.push(alloc)
            byWorker.set(alloc.worker, items)
        })

        for (const entry of Array.from(byWorker.entries())) {
            const worker = entry[0]
            const allocations = entry[1]
            await this.runAllocationsOnWorker(ns, worker, allocations)
        }
    }
}

