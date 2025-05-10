import "@jsext/polyfills/event-target";
import "./string.ts";
import "./number.ts";
import "./array.ts";
import "./uint8array.ts";
import "./object.ts";
import "./math.ts";
import "./promise.ts";
import "./collections.ts";
import "./error.ts";
import "./json.ts";
import "./types.ts";
import { customInspect } from "@jsext/runtime";

Object.defineProperty(Symbol, "customInspect", { value: customInspect });
