import { NS } from "../NetscriptDefinitions"
import { Queue } from "./lib/queue"

export async function main(ns: NS): Promise<void> {
    const baseName = "ahb"
    let multi = 2 // assumes you need up to 8gb for your hack and distro script. you may be able to lower this accordingly.
    const hackScript = "breach.ns"

    const servers = ns.getPurchasedServers()
    if (servers.length > 0) {
        const maxRam = servers.reduce((a, e) => Math.max(a, ns.getServerMaxRam(e)), 3)
        while (Math.pow(2, multi) < maxRam) multi++
    }

    const queue = new Queue<string>()
    for (let i = 0; i < servers.length; i++) {
        queue.push(servers[i])
    }

    let nameCounter = 1
    const maxRam = Math.pow(2, 20)
    while (true) {
        if (Math.pow(2, multi) >= maxRam) {
            console.log("maxed on servers, killing process")
            return
        }

        const count = queue.length()
        const cash = ns.getPlayer().money
        const ram = Math.min(Math.pow(2, 20), Math.pow(2, multi))
        const cost = ns.getPurchasedServerCost(ram)

        if (count >= ns.getPurchasedServerLimit() && cash >= cost) {
            const peek = queue.peek()
            if (!peek) {
                continue
            }
            
            if (Math.min(maxRam, Math.pow(2, multi)) <= ns.getServerMaxRam(peek)) {
                console.log("bumping ram multi from " + multi + " to " + (multi + 1))
                multi++
                continue
            }
            else {
                const current = queue.pop()
                if (current) {
                    console.log("deleting " + current)
                    ns.killall(current)
                    ns.deleteServer(current)
                }
            }
        }
        else if (count < ns.getPurchasedServerLimit() && cash >= cost) {
            const name = baseName + nameCounter
            nameCounter++
            console.log("purchasing " + name)
            const newBox = ns.purchaseServer(name, ram)
            queue.push(newBox)
            ns.run(hackScript, 1, newBox)
        }

        await ns.asleep(1000)
    }
}
