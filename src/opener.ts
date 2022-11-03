import { NS } from '@ns'
import { Scanner } from 'lib/scanner'
import { PortOpener } from 'lib/port_opener'

export async function main(ns : NS) : Promise<void> {

    while (true) {
        const hosts = new Scanner().scan(ns)

        const toHack= hosts.filtered((elem) => elem.hacked == false)

        const hackingLevel = ns.getPlayer().skills.hacking
        let hacked = false
        const po = new PortOpener(ns)
        for (const idx in toHack) {
            const hostPath = toHack[idx]
            if (hostPath.hacked) {
                continue
            }

            const server = ns.getServer(hostPath.hostname)

            if (server.requiredHackingSkill > hackingLevel) {
                console.log("%s TOO WEAK: %d < %d", 
                    server.hostname, hackingLevel, 
                    server.requiredHackingSkill)
                continue
            }

            if (po.open(server)) {
                ns.nuke(hostPath.hostname)
                if (ns.getServer(hostPath.hostname).hasAdminRights) {
                    console.log("%s succesfully rooted", hostPath.hostname)
                    hacked = true
                }
            } else {
                console.log("%s failed to open", hostPath.hostname)
            }
        }

        hosts.save(ns)

        if (!hacked) {
            console.log("nothing rooted, sleeping")
            await ns.sleep(60000)
        }
    }

}
