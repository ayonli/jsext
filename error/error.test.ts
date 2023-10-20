import "../augment.ts";
import { ok, strictEqual } from "node:assert";
import { isNode, isBun } from "../util.ts";

describe("Error", () => {
    it("Error.toObject", () => {
        // @ts-ignore
        const err1 = Object.assign(new Error("something went wrong", { cause: "unknown" }), {
            code: 500,
        });
        const obj1 = Error.toObject(err1);
        strictEqual(obj1["name"], err1.name);
        strictEqual(obj1["message"], err1.message);
        strictEqual(obj1["stack"], err1.stack);
        // @ts-ignore
        strictEqual(obj1["cause"], err1["cause"]);
        // @ts-ignore
        strictEqual(obj1["code"], err1.code);

        // @ts-ignore
        const err2 = Object.assign(new TypeError("something went wrong", { cause: "unknown" }), {
            code: 500,
        });
        const obj2 = Error.toObject(err2);
        strictEqual(obj2["name"], err2.name);
        strictEqual(obj2["message"], err2.message);
        strictEqual(obj2["stack"], err2.stack);
        // @ts-ignore
        strictEqual(obj2["cause"], err2["cause"]);
        // @ts-ignore
        strictEqual(obj2["code"], err2.code);

        // @ts-ignore
        const err3 = new Exception("something went wrong", { cause: "unknown", code: 500 });
        const obj3 = Error.toObject(err3);
        strictEqual(obj3["name"], err3.name);
        strictEqual(obj3["message"], err3.message);
        strictEqual(obj3["stack"], err3.stack);
        strictEqual(obj3["cause"], err3.cause);
        strictEqual(obj3["code"], err3.code);
    });

    it("Error.fromObject", () => {
        const obj1 = {
            name: "Error",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err1 = Error.fromObject(obj1);
        strictEqual(err1.constructor, Error);
        strictEqual(err1.name, obj1.name);
        strictEqual(err1.message, obj1.message);
        strictEqual(err1.stack, obj1.stack);
        // @ts-ignore
        strictEqual(err1["cause"], obj1.cause);
        // @ts-ignore
        strictEqual(err1["code"], obj1.code);

        const obj2 = {
            name: "EvalError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err2 = Error.fromObject(obj2);
        strictEqual(err2.constructor, EvalError);
        strictEqual(err2.name, obj2.name);
        strictEqual(err2.message, obj2.message);
        strictEqual(err2.stack, obj2.stack);
        // @ts-ignore
        strictEqual(err2["cause"], obj2.cause);
        // @ts-ignore
        strictEqual(err2["code"], obj2.code);

        const obj3 = {
            name: "RangeError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err3 = Error.fromObject(obj3);
        strictEqual(err3.constructor, RangeError);
        strictEqual(err3.name, obj3.name);
        strictEqual(err3.message, obj3.message);
        strictEqual(err3.stack, obj3.stack);
        // @ts-ignore
        strictEqual(err3["cause"], obj3.cause);
        // @ts-ignore
        strictEqual(err3["code"], obj3.code);

        const obj4 = {
            name: "ReferenceError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err4 = Error.fromObject(obj4);
        strictEqual(err4.constructor, ReferenceError);
        strictEqual(err4.name, obj4.name);
        strictEqual(err4.message, obj4.message);
        strictEqual(err4.stack, obj4.stack);
        // @ts-ignore
        strictEqual(err4["cause"], obj4.cause);
        // @ts-ignore
        strictEqual(err4["code"], obj4.code);

        const obj5 = {
            name: "SyntaxError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err5 = Error.fromObject(obj5);
        strictEqual(err5.constructor, SyntaxError);
        strictEqual(err5.name, obj5.name);
        strictEqual(err5.message, obj5.message);
        strictEqual(err5.stack, obj5.stack);
        // @ts-ignore
        strictEqual(err5["cause"], obj5.cause);
        // @ts-ignore
        strictEqual(err5["code"], obj5.code);

        const obj6 = {
            name: "TypeError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err6 = Error.fromObject(obj6);
        strictEqual(err6.constructor, TypeError);
        strictEqual(err6.name, obj6.name);
        strictEqual(err6.message, obj6.message);
        strictEqual(err6.stack, obj6.stack);
        // @ts-ignore
        strictEqual(err6["cause"], obj6.cause);
        // @ts-ignore
        strictEqual(err6["code"], obj6.code);

        const obj7 = {
            name: "URIError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err7 = Error.fromObject(obj7);
        strictEqual(err7.constructor, URIError);
        strictEqual(err7.name, obj7.name);
        strictEqual(err7.message, obj7.message);
        strictEqual(err7.stack, obj7.stack);
        // @ts-ignore
        strictEqual(err7["cause"], obj7.cause);
        // @ts-ignore
        strictEqual(err7["code"], obj7.code);

        const obj8 = {
            name: "Exception",
            message: "something went wrong",
            code: 500,
            cause: err2,
            stack: "",
        } as const;
        const err8 = Error.fromObject(obj8);
        strictEqual(err8.constructor, Exception);
        strictEqual(err8.name, obj8.name);
        strictEqual(err8.message, obj8.message);
        strictEqual(err8.cause, err2);
        strictEqual(err8.code, 500);
        strictEqual(err8.stack, obj8.stack);

        const obj9 = {
            name: "MyError",
            message: "something went wrong",
            stack: "",
            cause: "unknown",
            code: 500,
        } as const;
        const err9 = Error.fromObject(obj9);
        strictEqual(err9?.constructor, Error);
        strictEqual(err9?.name, obj9.name);
        strictEqual(err9?.message, obj9.message);
        strictEqual(err9?.stack, obj9.stack);
        // @ts-ignore
        strictEqual(err9?.["cause"], obj9.cause);
        // @ts-ignore
        strictEqual(err9?.["code"], obj9.code);

        strictEqual(Error.fromObject({ foo: "bar" }), null);
    });

    it("Error.prototype.toJSON", () => {
        // @ts-ignore
        const err1 = Object.assign(new Error("something went wrong", { cause: "unknown" }), {
            code: 500,
        });
        const obj1 = err1.toJSON();
        strictEqual(obj1["name"], err1.name);
        strictEqual(obj1["message"], err1.message);
        strictEqual(obj1["stack"], err1.stack);
        // @ts-ignore
        strictEqual(obj1["cause"], err1["cause"]);
        // @ts-ignore
        strictEqual(obj1["code"], err1.code);

        // @ts-ignore
        const err2 = Object.assign(new TypeError("something went wrong", { cause: "unknown" }), {
            code: 500,
        });
        const obj2 = err2.toJSON();
        strictEqual(obj2["name"], err2.name);
        strictEqual(obj2["message"], err2.message);
        strictEqual(obj2["stack"], err2.stack);
        // @ts-ignore
        strictEqual(obj2["cause"], err2["cause"]);
        // @ts-ignore
        strictEqual(obj2["code"], err2.code);

        // @ts-ignore
        const err3 = new Exception("something went wrong", { cause: "unknown", code: 500 });
        const obj3 = err3.toJSON();
        strictEqual(obj3["name"], err3.name);
        strictEqual(obj3["message"], err3.message);
        strictEqual(obj3["stack"], err3.stack);
        strictEqual(obj3["cause"], err3.cause);
        strictEqual(obj3["code"], err3.code);
    });

    it("Error.toErrorEvent", function () {
        if (isNode) { // Node.js doesn't support ErrorEvent at the moment
            this.skip();
        }

        const err = new Error("something went wrong");
        const event = Error.toErrorEvent(err);

        strictEqual(event.error, err);
        strictEqual(event.message, err.message);
        strictEqual(
            event.filename.replace(/^(file|https?):\/\//, ""),
            import.meta.url.replace(/^(file|https?):\/\//, ""));

        if (isBun) { // Bun has issue to locate line number at the moment.
            ok(event.lineno > 0);
            ok(event.colno > 0);
        } else {
            strictEqual(event.lineno, 240);
            strictEqual(event.colno, 21);
        }

        const err2 = new Error("something went wrong");
        err2.stack = (err2.stack as string).split("\n").map(line => {
            // In Firefox and Safari, the call-site uses `@` prefix, we should simulate
            // and test that.
            return line.replace("    at ", "@");
        }).join("\n");
        const event2 = Error.toErrorEvent(err2);

        strictEqual(event2.error, err2);
        strictEqual(event2.message, err.message);
        strictEqual(
            event2.filename.replace(/^(file|https?):\/\//, ""),
            import.meta.url.replace(/^(file|https?):\/\//, ""));

        if (isBun) {
            ok(event2.lineno > 0);
            ok(event2.colno > 0);
        } else {
            strictEqual(event2.lineno, 257);
            strictEqual(event2.colno, 22);
        }

        // Even more edge scenarios
        const err3 = new Error("something went wrong");
        err3.stack = [
            "foo@debugger eval code:2:9",
            "@debugger eval code:1:7"
        ].join("\n");
        const event3 = Error.toErrorEvent(err3, "messageerror");

        strictEqual(event3.error, err3);
        strictEqual(event3.message, err3.message);
        strictEqual(event3.filename, "debugger eval code");
        strictEqual(event3.lineno, 2);
        strictEqual(event3.colno, 9);
        strictEqual(event3.type, "messageerror");
    });

    it("Error.fromErrorEvent", function () {
        if (isNode) { // Node.js doesn't support ErrorEvent at the moment
            this.skip();
        }

        const filename = import.meta.url.replace(/^(file|https?):\/\//, "");
        const err = new Error("something went wrong");

        const event = new ErrorEvent("error", {
            error: err,
            message: err.message,
            filename,
            lineno: 301,
            colno: 21,
        });

        const err1 = Error.fromErrorEvent(event);
        strictEqual(err1, err);

        const event2 = new ErrorEvent("error", {
            message: err.message,
            filename,
            lineno: 301,
            colno: 21,
        });
        const err2 = Error.fromErrorEvent(event2);
        strictEqual(err2?.message, err.message);
        strictEqual(err2?.stack, `Error: ${err.message}\n    at ${filename}:${301}:21`);

        const event3 = new ErrorEvent("error", {
            error: Error.toObject(err),
            message: err.message,
            filename,
            lineno: 301,
            colno: 21,
        });
        const err3 = Error.fromErrorEvent(event3);
        strictEqual(err3?.name, err.name);
        strictEqual(err3?.message, err.message);
        strictEqual(err3?.stack, err.stack);
    });
});
