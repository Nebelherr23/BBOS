import { NetscriptPort } from "NetscriptDefinitions";
import { Colors as Fonts } from '@/lib/utils';

export enum LogLevel {
    DEBUG = 0,
    INFO = 10,
    WARNING = 20,
    ERROR = 30,
    CRITICAL = 50
}

export class Logger {
    port: NetscriptPort;
    minLevel: LogLevel;
    prefix: string;
    messages: Map<string, string> = new Map<string, string>();
    ns: NS;

    constructor(ns: NS, module: string, minLevel: keyof typeof LogLevel = 'INFO') {
        this.port = ns.getPortHandle(Number(ns.read('/tmp/pid/log-master.txt')));
        this.prefix = module;
        this.minLevel = LogLevel[minLevel];
        let msg = JSON.parse(ns.read(`/data/logging/messages/${this.prefix.toLowerCase()}.json`))[0];
        for (const item of Object.keys(msg)) {
            this.messages.set(item, msg[item]);
        }
        for (let [key, msg] of this.messages.entries()) {
            ns.print(`${key} -> ${msg}`);
        }
        this.ns = ns;
    }

    processMessage(event: string, extra: Map<string, string> | undefined): string {
        function getExtra(match: string, p1: string, offset: number) {
            let key = match.replaceAll("%", "");
            return String(extra?.has(key) ? extra?.get(key) : match);
        };
        let item: string = String(this.messages.get(event));
        const tpl_re = new RegExp('(\%.*?\%)', 'gi');
        let out: string = item?.replaceAll(tpl_re, getExtra);
        return out;
    }

    log(level: keyof typeof LogLevel, event: string, extra: Map<string, string>) {
        let msg = this.processMessage(event, extra);
        let out = new LogRecord(this.prefix, level, event, msg);
        this.ns.print(`Port Write -> ${out.toJson()}`);
        let success = this.port.tryWrite(out);
        if (!success) { this.log(level,event,extra); }
    }
    info(event: string, extra: Map<string, string>) { this.log('INFO', event, extra); }
    debug(event: string, extra: Map<string, string>) { this.log('DEBUG', event, extra); }
    warning(event: string, extra: Map<string, string>) { this.log('WARNING', event, extra); }
    error(event: string, extra: Map<string, string>) { this.log('ERROR', event, extra); }
    critical(event: string, extra: Map<string, string>) { this.log('CRITICAL', event, extra); }
}

export class LogRecord {
    module: string;
    event: string;
    level: string;
    msg: string
    constructor(module: string, level: keyof typeof LogLevel, event: string, msg: string) {
        this.msg = msg;
        switch (level) {
            case "DEBUG":
                this.level = `${Fonts.BLUE}DBG${Fonts.RESET}`;
                break;
            case "INFO":
                this.level = `${Fonts.GREEN}INF${Fonts.RESET}`;
                break;
            case "WARNING":
                this.level = `${Fonts.YELLOW}WRN${Fonts.RESET}`;
                break;
            case "ERROR":
                this.level = `${Fonts.RED}ERR${Fonts.RESET}`;
                break;
            case "CRITICAL":
                this.level = `${Fonts.PURPLE}CRT${Fonts.RESET}`;
                break;
        }
        this.module = module;
        this.event = event;
    }

    toJson(): string {
        return JSON.stringify(this);
    }
}