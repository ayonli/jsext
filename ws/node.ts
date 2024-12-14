import { WebSocket } from "ws";

// @ts-ignore for WebSocketStream polyfill
globalThis.WebSocket ??= WebSocket;

export * from "../ws.ts";
