import { NS } from '@ns'
import { HostData, HostList } from './lib/hostdata'

export async function main(ns : NS) : Promise<void> {

    while (true) {
        const hostPaths: HostData[] = HostList.load(ns).hosts
    
        const hackingSkill = ns.getPlayer().skills.hacking

        for (const idx in hostPaths) {
            const hostPath = hostPaths[idx]
            if (hostPath.hacked) {
                const scriptName = "hacking.js"

                if (ns.scriptRunning(scriptName, hostPath.hostname)) {
                    continue
                }

                const server = ns.getServer(hostPath.hostname)
                if (server.purchasedByPlayer || server.requiredHackingSkill > hackingSkill) {
                    continue
                }
                const serverRam = server.maxRam
                if (server.moneyMax < 1) {
                    continue
                }
                const scriptRam = ns.getScriptRam(scriptName)
                  
                const threads = serverRam / scriptRam
            
                console.log("Calculated: %f = %f/%f", threads, serverRam, scriptRam)
    
                if (threads < 1) {
                    console.log('Not enough ram for %s on %s: %d', scriptName, hostPath.hostname, serverRam)
                    continue
                }
    
                console.log('Starting %s with %d (RAM %d) threads on %s', scriptName, threads, serverRam, hostPath.hostname)
            
                ns.scriptKill(scriptName, hostPath.hostname)
                do {
                    const server = ns.getServer(hostPath.hostname)
                    if (server.ramUsed > 0) {
                        ns.sleep(500)
                    } else {
                        break
                    }
                } while (true)
                ns.rm(scriptName, hostPath.hostname)
                ns.scp(scriptName, hostPath.hostname)
                if (ns.exec(scriptName, hostPath.hostname, threads, hostPath.hostname) == 0) {
                    console.log('Unable to start %s with %d threads on %s', scriptName, threads, hostPath.hostname)
                }
            }
        }
        await ns.sleep(60000)
    }


}