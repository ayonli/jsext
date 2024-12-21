import { WebSocket } from 'ws';
export { WebSocketServer } from '../ws.js';
export { WebSocket, WebSocketStream, toWebSocketStream } from './client.js';

var _a;
// @ts-ignore for WebSocketStream polyfill
(_a = globalThis.WebSocket) !== null && _a !== void 0 ? _a : (globalThis.WebSocket = WebSocket);
//# sourceMappingURL=node.js.map
