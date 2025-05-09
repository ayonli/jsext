import "./external/event-target-polyfill/index.ts";
import "./augment/string.ts";
import "./augment/number.ts";
import "./augment/array.ts";
import "./augment/uint8array.ts";
import "./augment/object.ts";
import "./augment/math.ts";
import "./augment/promise.ts";
import "./augment/collections.ts";
import "./augment/error.ts";
import "./augment/json.ts";
import "./augment/types.ts";
import { customInspect } from "./runtime.ts";

Object.defineProperty(Symbol, "customInspect", { value: customInspect });
