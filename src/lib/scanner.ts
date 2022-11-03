import { NS, Server } from '@ns'
import { Queue } from 'lib/queue'
import { HostData, HostList } from '/lib/hostdata.js'

export class Scanner {

    recordPath: boolean

    constructor(recordPath = false) {
        this.recordPath = recordPath
    }

    scan(ns: NS): HostList {
        
        const toScan = new Queue<HostData>()

        const visited = new Set<string>()
        const hosts: HostData[] = []

        toScan.push(new HostData("home", [], true, 0))
        do {
            const nextHost = toScan.pop()
            if (nextHost == null) {
                break
            }
            if (visited.has(nextHost.hostname)) {
                continue
            }
            visited.add(nextHost.hostname)
    
            const server = ns.getServer(nextHost.hostname)
            nextHost.contracts = ns.ls(server.hostname, '.cct')
            nextHost.maxMoney = server.moneyMax
            if (!server.hasAdminRights) {
                if (this.isHackable(ns, server)) {
                    console.log("%s: TO HACK - Do not have admin rights", server.hostname)
                    hosts.push(nextHost)
                }
                continue
            } else {
                if (!server.purchasedByPlayer) {
                    nextHost.hacked = true
                    hosts.push(nextHost)
                    if (ns.isRunning("hacking.js", server.hostname, server.hostname)) {
                        // console.log("%s: OWNED, HACKING", server.hostname)
                    } else if (server.moneyMax > 0) {
                        console.log("%s: OWNED, NO SCRIPT", server.hostname)
                    }
                }
            }
    
            const scanned = ns.scan(server.hostname)
            toScan.pushAll(scanned.map((elem) => {
                let path: string[] = []
                if (this.recordPath) {
                    path = nextHost.path.concat([nextHost.hostname])
                }
                return new HostData(elem, path, false, 0)
            }))
        } while (!toScan.isEmpty())
        return new HostList(hosts)
    }

    isHackable(ns: NS, server: Server): boolean {
        const player = ns.getPlayer()

        if (server.requiredHackingSkill > player.skills.hacking) {
            console.log("%s: TOO WEAK - %d > %d", server.hostname, server.requiredHackingSkill, player.skills.hacking)
            return false
        }
        return true
    }
}