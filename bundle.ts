import "./augment/index.ts";
import jsext from "./index.ts";
import * as archive from "./archive/index.ts";
import * as array from "./array/index.ts";
import * as _async from "./async/index.ts";
import * as bytes from "./bytes/index.ts";
import * as _class from "./class/index.ts";
import * as cli from "./cli/index.ts";
import * as collections from "./collections/index.ts";
import * as dialog from "./dialog/index.ts";
import * as encoding from "./encoding/index.ts";
import * as error from "./error/index.ts";
import * as event from "./event/index.ts";
import * as filetype from "./filetype/index.ts";
import * as fs from "./fs/index.ts";
import * as hash from "./hash/index.ts";
import * as http from "@jsext/http";
import * as json from "./json/index.ts";
import * as math from "./math/index.ts";
import * as module from "./module/index.ts";
import * as net from "./net/index.ts";
import * as number from "./number/index.ts";
import * as object from "./object/index.ts";
import * as path from "./path/index.ts";
import * as reader from "./reader/index.ts";
import * as result from "./result/index.ts";
import * as runtime from "./runtime/index.ts";
import * as sse from "./sse/index.ts";
import * as string from "./string/index.ts";
import * as types from "./types/index.ts";
import * as ws from "./ws/index.ts";
import { Queue } from "./queue/index.ts";
import { Mutex } from "./lock/index.ts";
import { Channel } from "./chan/index.ts";

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
