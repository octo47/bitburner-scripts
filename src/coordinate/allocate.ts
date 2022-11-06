import { NS, Server } from '@ns'
import { Scanner } from 'lib/scanner.js'
import { Capacity } from 'coordinate/capacity.js'
import { Allocator, Allocation, WorkType } from 'coordinate/allocator.js'
import { Grow } from 'coordinate/types.js'

export async function main(ns : NS) : Promise<void> {

    
    function allocateGrowing(allocator: Allocator, targets: Server[]): Allocation[] {

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
                threads: threadsToDouble
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

    function allocateHack(allocator: Allocator, targets: Server[]): Allocation[] {
        return []
    }

    function allocateWeaken(allocator: Allocator, targets: Server[]): Allocation[] {
        return []
    }


    const servers = new Scanner()
        .scan(ns)
        .hosts
        .map((item) => ns.getServer(item.hostname))

    const targets = servers.filter((srv) => srv.hasAdminRights && srv.moneyAvailable > 0)

    const capacity = new Capacity(ns, servers)

    console.log(capacity)

    const allocator = new Allocator(capacity)

    const allocations: Allocation[] = []

    allocateGrowing(allocator, targets).forEach((elem) => allocations.push(elem))
    allocateHack(allocator, targets).forEach((elem) => allocations.push(elem))
    allocateWeaken(allocator, targets).forEach((elem) => allocations.push(elem))

    allocations.forEach((g) => console.log(g))
}