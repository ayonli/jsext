import "./augment.ts";
import jsext from "./index.ts";
import * as string from "./string.ts";
import * as number from "./number.ts";
import * as array from "./array.ts";
import * as object from "./object.ts";
import * as json from "./json.ts";
import * as math from "./math.ts";
import * as promise from "./async.ts";
import * as error from "./error.ts";
import * as collections from "./collections.ts";
import * as bytes from "./bytes.ts";
import * as path from "./path.ts";
import * as dialog from "./dialog.ts";

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
