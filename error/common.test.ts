import { strictEqual } from "node:assert";
import {
    AlreadyExistsError,
    NetworkError,
    NotAllowedError,
    NotFoundError,
    NotImplementedError,
    NotSupportedError,
    TimeoutError,
} from "./common";

describe("error/common", () => {
    it("NotAllowedError", () => {
        const err1 = new NotAllowedError("operation not allowed");
        strictEqual(err1.name, "NotAllowedError");
        strictEqual(err1.code, 403);
        strictEqual(err1.message, "operation not allowed");

        const err2 = new NotAllowedError("operation not allowed", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("NotFoundError", () => {
        const err1 = new NotFoundError("resource not found");
        strictEqual(err1.name, "NotFoundError");
        strictEqual(err1.code, 404);
        strictEqual(err1.message, "resource not found");

        const err2 = new NotFoundError("resource not found", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("AlreadyExistsError", () => {
        const err1 = new AlreadyExistsError("resource already exists");
        strictEqual(err1.name, "AlreadyExistsError");
        strictEqual(err1.code, 409);
        strictEqual(err1.message, "resource already exists");

        const err2 = new AlreadyExistsError("resource already exists", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("NotSupportedError", () => {
        const err1 = new NotSupportedError("operation is not supported");
        strictEqual(err1.name, "NotSupportedError");
        strictEqual(err1.code, 405);
        strictEqual(err1.message, "operation is not supported");

        const err2 = new NotSupportedError("operation is not supported", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("NotImplementedError", () => {
        const err1 = new NotImplementedError("operation is not implemented");
        strictEqual(err1.name, "NotImplementedError");
        strictEqual(err1.code, 501);
        strictEqual(err1.message, "operation is not implemented");

        const err2 = new NotImplementedError("operation is not implemented", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("TimeoutError", () => {
        const err1 = new TimeoutError("operation is timed out");
        strictEqual(err1.name, "TimeoutError");
        strictEqual(err1.code, 408);
        strictEqual(err1.message, "operation is timed out");

        const err2 = new TimeoutError("operation is timed out", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });

    it("NetworkError", () => {
        const err1 = new NetworkError("connection cannot be established");
        strictEqual(err1.name, "NetworkError");
        strictEqual(err1.code, 0);
        strictEqual(err1.message, "connection cannot be established");

        const err2 = new NetworkError("connection cannot be established", {
            cause: err1,
        });
        strictEqual(err2.cause, err1);
    });
});
