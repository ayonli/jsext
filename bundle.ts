import "./augment.ts";
import jsext from "./index.ts";
import * as array from "./array.ts";
import * as _async from "./async.ts";
import * as bytes from "./bytes.ts";
import * as _class from "./class.ts";
import * as cli from "./cli.ts";
import * as collections from "./collections.ts";
import * as dialog from "./dialog.ts";
import * as error from "./error.ts";
import * as filetype from "./filetype.ts";
import * as json from "./json.ts";
import * as math from "./math.ts";
import * as module from "./module.ts";
import * as number from "./number.ts";
import * as object from "./object.ts";
import * as path from "./path.ts";
import * as string from "./string.ts";

export default {
    ...jsext,
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
    error,
    filetype,
    json,
    math,
    module,
    number,
    object,
    path,
    string,
};
