import "./augment.ts";
import jsext from "./index.ts";
import * as string from "./string/index.ts";
import * as number from "./number/index.ts";
import * as array from "./array/index.ts";
import * as object from "./object/index.ts";
import * as json from "./json/index.ts";
import * as math from "./math/index.ts";
import * as promise from "./promise/index.ts";
import * as error from "./error/index.ts";
import * as collections from "./collections/index.ts";
import * as bytes from "./bytes/index.ts";
import * as path from "./path/index.ts";
import * as dialog from "./dialog/index.ts";

export default {
    ...jsext,
    string,
    number,
    array,
    object,
    json,
    math,
    promise,
    error,
    collections,
    bytes: {
        ...object.omit(bytes, ["default"]),
        bytes: bytes.default,
    },
    path,
    dialog,
};
