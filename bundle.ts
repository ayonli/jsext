import "./augment.ts";
import jsext from "./index.ts";
import * as archive from "./archive.ts";
import * as array from "./array.ts";
import * as _async from "./async.ts";
import * as bytes from "./bytes.ts";
import * as _class from "./class.ts";
import * as cli from "./cli.ts";
import * as collections from "./collections.ts";
import * as dialog from "./dialog.ts";
import * as encoding from "./encoding.ts";
import * as error from "./error.ts";
import * as event from "./event.ts";
import * as filetype from "./filetype.ts";
import * as fs from "./fs.ts";
import * as hash from "./hash.ts";
import * as http from "./http.ts";
import * as json from "./json.ts";
import * as math from "./math.ts";
import * as module from "./module.ts";
import * as net from "./net.ts";
import * as number from "./number.ts";
import * as object from "./object.ts";
import * as path from "./path.ts";
import * as reader from "./reader.ts";
import * as result from "./result.ts";
import * as runtime from "./runtime.ts";
import * as sse from "./sse.ts";
import * as string from "./string.ts";
import * as types from "./types.ts";
import * as ws from "./ws.ts";
import { Queue } from "./queue.ts";
import { Mutex } from "./lock.ts";
import { Channel } from "./chan.ts";

export default {
    Queue,
    Mutex,
    Channel,
    ...types,
    ...jsext,
    archive,
    array,
    async: _async,
    bytes: {
        ...object.omit(bytes, ["default"]),
        bytes: bytes.default,
    },
    class: _class,
    cli,
    collections,
    dialog,
    encoding,
    error,
    event,
    filetype,
    fs,
    hash: {
        ...object.omit(hash, ["default"]),
        hash: hash.default,
    },
    http,
    json,
    math,
    module,
    net,
    number,
    object,
    path,
    reader,
    result,
    runtime: {
        ...object.omit(runtime, ["default"]),
        runtime: runtime.default,
    },
    sse,
    string,
    ws,
};
