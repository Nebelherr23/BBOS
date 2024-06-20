import { LogRecord } from '@/lib/logging';
export async function main(ns: NS) {
    let flags = ns.flags([
        ['debug', false]
    ]);

    if (flags.debug) {
        ns.tail();
        ns.disableLog('ALL');
    }
    let port = ns.getPortHandle(ns.pid);
    ns.write('/tmp/pid/log-master.txt', String(ns.pid), "w");
    ns.atExit(() => {
        running = false;
        port.clear();
        ns.rm('/tmp/pid/log-master.txt');
    });
    let running = true;
    do {
        if (port.empty()) {await port.nextWrite(); }
        let logRecord: LogRecord = port.read();
        if (typeof (logRecord) != "string") {
            ns.printf(`Port Read -> ${JSON.stringify(logRecord)}`);
            ns.tprintf(`[${logRecord.module}-${logRecord.event}:${logRecord.level}] - ${logRecord.msg}`);
        }
        
    } while (running);
}