import { NS, ProcessInfo, Server } from '@ns'
import { Scanner } from 'lib/scanner.js'
import { Allocator, Allocation, WorkType } from 'coordinate/allocator.js'
import { Grow, Hack, Weaken } from 'coordinate/types.js'
import { words } from 'lodash'


const debug = false

export class Coordinator {
    
    allocateGrowing(ns: NS, allocator: Allocator, targets: Server[]): Allocation[] {

        const allocations: Allocation[] = []

        const eligable = targets.filter((target) => target.moneyMax > 0 &&
        target.moneyAvailable < target.moneyMax &&
            ns.getServerSecurityLevel(target.hostname) < ns.getServerMinSecurityLevel(target.hostname) * 1.05)

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
        if (debug) {
            console.log({
                growing: inOrder
            })
        }


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
                target.moneyAvailable > target.moneyMax * 0.95
        })

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
        if (debug) {
            console.log({
                hacking: inOrder
            })
        }


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
            const weakenThreads = Math.ceil(weakenAmount / weakenDecrese)
            const weakenTime = ns.getWeakenTime(target.hostname) * weakenThreads / 1000 / 60
            const security = [
                ns.getServerMinSecurityLevel(target.hostname),
                ns.getServerSecurityLevel(target.hostname)
            ]
             return { 
                hostname: target.hostname,
                amount: weakenAmount,
                threads: weakenThreads,
                time: weakenTime,
                security: security
            } as Weaken
        })

        inOrder.sort((a, b) => a.threads - b.threads)

        if (debug) {
            console.log({
                weaken: inOrder
            })
        }

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

        scripts.sort((a, b) => a.worker.localeCompare(b.worker))

        if (debug) {
            console.log({
                allocations: scripts,
                ps: toKill
            })
        }

        for (let i = 0; i < scripts.length; i++) {
            const g = scripts[i]
            const running = toKill.find((proc) => { return proc.filename === g.script && proc.args[0] === g.target })
            if (running) {
                if (running.filename === g.script && 
                    running.args[0] === g.target && 
                    running.threads === g.threads) {
                    toKill = toKill.filter((proc) => proc.pid !== running.pid)
                } else {
                    startable.push(g)
                }
            } else {
                startable.push(g)
            }
        }

        for (let i = 0; i < toKill.length; i++) {
            await this.killProcess(ns, worker, toKill[i])
        }

        for (let i = 0; i < startable.length; i++) {
            const g = startable[i]
            await ns.scp(g.script, g.worker)
            await ns.exec(g.script, g.worker, g.threads, g.target)
            console.log({
                "action": "started",
                "worker": g.worker,
                "target": g.target,
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

        this.allocateHack(ns, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateGrowing(ns, allocator, targets).forEach((elem) => allocations.push(elem))
        this.allocateWeaken(ns, allocator, targets).forEach((elem) => allocations.push(elem))

        const byWorker: Map<string, Allocation[]> = new Map()        

        allocations.sort((a, b) => a.worker.localeCompare(b.worker))

        allocations.forEach((alloc) => {
            const items = byWorker.get(alloc.worker) ?? []
            items.push(alloc)
            byWorker.set(alloc.worker, items)
        })

        if (debug) {
            console.log(byWorker)
        }

        for (const entry of Array.from(byWorker.entries())) {
            const worker = entry[0]
            const allocations = entry[1]
            await this.runAllocationsOnWorker(ns, worker, allocations)
        }
    }

    async killProcess(ns: NS, worker: string, ps: ProcessInfo): Promise<void>{
        console.log("%s killing %s %d", worker, ps.filename,  ps.pid)

        ns.kill(ps.filename, worker, ...ps.args)

        while (ns.getRunningScript(ps.pid, worker, ...ps.args)) {
            await ns.sleep(100)
        }
    }
}

