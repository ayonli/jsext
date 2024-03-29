import type { Worker as NodeWorker } from "node:worker_threads";

export type { NodeWorker };

export interface BunWorker extends Worker {
    ref(): void;
    unref(): void;
}

export type CallRequest = {
    type: "call";
    module: string;
    fn: string;
    args: any[];
    taskId?: number | undefined;
} | {
    type: | "next" | "return" | "throw";
    args: any[];
    taskId: number;
};

export type CallResponse = {
    type: "return" | "yield" | "error" | "gen";
    taskId?: number | undefined;
    value?: any;
    error?: unknown;
    done?: boolean | undefined;
};

export type ChannelMessage = {
    type: "send" | "close";
    value?: any;
    channelId: number;
};
