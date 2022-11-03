import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {

    const target = ns.args[0] as string
    const scriptName = "worker.js"

    const servers = ns.getPurchasedServers()

    for (let i = 0; i < servers.length; i++) {
        ns.scp(scriptName, servers[i])
        const ram = ns.getScriptRam(scriptName)
        const threads = ns.getServerMaxRam(servers[i]) / ram
        if (threads > 0) {
            ns.scriptKill(scriptName, servers[i])
            console.log("Starting %s on %s with %d threads: target %s", scriptName, servers[i], threads, target)
            ns.exec(scriptName, servers[i], threads, target)
        }
    }
}