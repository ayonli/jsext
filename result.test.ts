import { ok, strictEqual } from "node:assert";
import { Err, Ok, Result } from "./result.ts";
import _try from "./try.ts";

function divide(a: number, b: number): number | never {
    if (b === 0) {
        throw new RangeError("division by zero");
    }

    return a / b;
}

function divideR(a: number, b: number): Result<number, RangeError> {
    if (b === 0) {
        return Err(new RangeError("division by zero"));
    }

    return Ok(a / b);
}

describe("result", () => {
    it("Ok", () => {
        const result = Ok(10);
        strictEqual(result.ok, true);
        strictEqual(result.value, 10);
        strictEqual("error" in result, false);
    });

    it("Err", () => {
        const err = new Error("something went wrong");
        const result = Err(err);
        strictEqual(result.ok, false);
        strictEqual(result.error, err);
        strictEqual("value" in result, false);
    });

    it("unwrap", () => {
        const result1 = Ok(10);
        strictEqual(result1.unwrap(), 10);

        const result2 = Err<Error, number>(new Error("something went wrong"));
        const [err] = _try(() => result2.unwrap());
        ok(!result2.ok && result2.error === err);

        const result3 = Err<Error, number>(new Error("something went wrong"));
        let _err: Error | undefined;
        const [, value3] = _try(() => result3.unwrap(error => {
            _err = error;
            return 0;
        }));
        ok(!result3.ok && result3.error === _err);
        strictEqual(value3, 0);
    });

    it("optional", () => {
        const result = Err<Error, number>(new Error("something went wrong"));
        const value = result.optional();
        strictEqual(value, undefined);
    });

    describe("wrap", () => {
        it("regular functions", () => {
            const result1 = Result.wrap<number, RangeError>(() => divide(10, 2));
            strictEqual(result1.ok, true);
            strictEqual(result1.value, 5);

            const result2 = Result.wrap<number, RangeError>(() => divide(10, 0));
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "division by zero");
        });

        it("async functions", async () => {
            const result1 = await Result.wrap<number, RangeError>(async () => divide(10, 2));
            strictEqual(result1.ok, true);
            strictEqual(result1.value, 5);

            const result2 = await Result.wrap<number, RangeError>(async () => divide(10, 0));
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "division by zero");
        });

        it("functions return Result", async () => {
            const result1 = Result.wrap(() => divideR(10, 2));
            strictEqual(result1.ok, true);
            strictEqual(result1.value, 5);

            const result2 = Result.wrap(() => divideR(10, 0));
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "division by zero");

            const result3 = await Result.wrap(async () => divideR(10, 2));
            strictEqual(result3.ok, true);
            strictEqual(result3.value, 5);

            const result4 = await Result.wrap(async () => divideR(10, 0));
            strictEqual(result4.ok, false);
            strictEqual(result4.error?.message, "division by zero");
        });

        it("functions returns void", async () => {
            const result1 = Result.wrap(() => { });
            strictEqual(result1.ok, true);
            strictEqual(result1.value, undefined);

            const result2 = Result.wrap<never, Error>(() => {
                throw new Error("something went wrong");
            });
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "something went wrong");

            const result3 = await Result.wrap(async () => { });
            strictEqual(result3.ok, true);
            strictEqual(result3.value, undefined);

            const result4 = await Result.wrap<never, Error>(async () => {
                throw new Error("something went wrong");
            });
            strictEqual(result4.ok, false);
            strictEqual(result4.error?.message, "something went wrong");
        });

        it("error propagation", async () => {
            function divideAndTimes(a: number, b: number, c: number): Result<number, RangeError> {
                const result = divideR(a, b).unwrap();
                return Ok(result * c);
            }

            function divideAsync(a: number, b: number): Promise<Result<number, RangeError>> {
                return Result.wrap(async () => divideR(a, b));
            }

            async function divideAndTimesAsync(
                a: number,
                b: number,
                c: number
            ): Promise<Result<number, RangeError>> {
                const result = (await divideAsync(a, b)).unwrap();
                return Ok(result * c);
            }

            const result1 = Result.wrap<number, RangeError>(() => divideAndTimes(10, 2, 3));
            strictEqual(result1.ok, true);
            strictEqual(result1.value, 15);

            const result2 = Result.wrap<number, RangeError>(() => divideAndTimes(10, 0, 3));
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "division by zero");

            const result3 = await Result.wrap<number, RangeError>(() => divideAndTimesAsync(10, 2, 3));
            strictEqual(result3.ok, true);
            strictEqual(result3.value, 15);

            const result4 = await Result.wrap<number, RangeError>(() => divideAndTimesAsync(10, 0, 3));
            strictEqual(result4.ok, false);
            strictEqual(result4.error?.message, "division by zero");
        });

        it("decorator", async () => {
            class Test {
                @Result.wrap()
                divide(a: number, b: number): Result<number, RangeError> {
                    if (b === 0) {
                        return Err(new RangeError("division by zero"));
                    }

                    return Ok(a / b);
                }

                @Result.wrap()
                divideAndTimes(a: number, b: number, c: number): Result<number, RangeError> {
                    const result = this.divide(a, b).unwrap();
                    return Ok(result * c);
                }

                @Result.wrap()
                async divideAsync(a: number, b: number): Promise<Result<number, RangeError>> {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return this.divide(a, b);
                }

                @Result.wrap()
                async divideAndTimesAsync(
                    a: number,
                    b: number,
                    c: number
                ): Promise<Result<number, RangeError>> {
                    const result = (await this.divideAsync(a, b)).unwrap();
                    return Ok(result * c);
                }
            }

            const test = new Test();
            const result1 = test.divide(10, 2);
            strictEqual(result1.ok, true);
            strictEqual(result1.value, 5);

            const result2 = test.divide(10, 0);
            strictEqual(result2.ok, false);
            strictEqual(result2.error?.message, "division by zero");

            const result3 = test.divideAndTimes(10, 2, 3);
            strictEqual(result3.ok, true);
            strictEqual(result3.value, 15);

            const result4 = test.divideAndTimes(10, 0, 3);
            strictEqual(result4.ok, false);
            strictEqual(result4.error?.message, "division by zero");

            const result5 = await test.divideAsync(10, 2);
            strictEqual(result5.ok, true);
            strictEqual(result5.value, 5);

            const result6 = await test.divideAsync(10, 0);
            strictEqual(result6.ok, false);
            strictEqual(result6.error?.message, "division by zero");

            const result7 = await test.divideAndTimesAsync(10, 2, 3);
            strictEqual(result7.ok, true);
            strictEqual(result7.value, 15);

            const result8 = await test.divideAndTimesAsync(10, 0, 3);
            strictEqual(result8.ok, false);
            strictEqual(result8.error?.message, "division by zero");
        });
    });
});
