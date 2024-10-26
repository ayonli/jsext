import { deepStrictEqual, strictEqual } from "node:assert";
import { param, returns, throws } from "./decorators.ts";
import { z } from "zod";
import _try from "../try.ts";

describe("class/decorators", () => {
    it("param", () => {
        const calculator = new Calculator();

        strictEqual(calculator.add(1, 2), 3);

        // @ts-ignore for testing
        const [err1, res1] = _try(() => calculator.add("1", 2));
        strictEqual(res1, undefined);
        strictEqual((err1 as TypeError).name, "TypeError");
        strictEqual((err1 as TypeError).message,
            "validation failed at parameter a: expected number, received string");

        // @ts-ignore for testing
        const [err2, res2] = _try(() => calculator.add(1, "2"));
        strictEqual(res2, undefined);
        strictEqual((err2 as TypeError).name, "TypeError");
        strictEqual((err2 as TypeError).message,
            "validation failed at parameter b: expected number, received string");

        const broadcaster = new Broadcaster();

        strictEqual(broadcaster.broadcast({
            title: "Hello, World!",
            content: "Welcome to the world of decorators."
        }), 48);

        // @ts-ignore for testing
        const [err3, res3] = _try(() => broadcaster.broadcast({
            title: "Hello, World!",
        }));
        strictEqual(res3, undefined);
        strictEqual((err3 as TypeError).name, "TypeError");
        strictEqual((err3 as TypeError).message,
            "validation failed at parameter news.content: required");

        // @ts-ignore for testing
        const [err4, res4] = _try(() => broadcaster.broadcast({
            title: "Hello, World!",
            // @ts-ignore for testing
            content: 123,
        }));
        strictEqual(res4, undefined);
        strictEqual((err4 as TypeError).name, "TypeError");
        strictEqual((err4 as TypeError).message,
            "validation failed at parameter news.content: expected string, received number");
    });

    it("returns", async () => {
        const calculator = new Calculator();

        strictEqual(calculator.add(1, 2), 3);

        // @ts-ignore for testing
        const [err3, res3] = _try(() => calculator.subtract(3, 2));
        strictEqual(res3, undefined);
        strictEqual((err3 as TypeError).name, "TypeError");
        strictEqual((err3 as TypeError).message,
            "validation failed at return value: expected number, received string");

        const broadcaster = new Broadcaster();

        deepStrictEqual(broadcaster.copy({
            title: "Hello, World!",
            content: "Welcome to the world of decorators."
        }), {
            title: "Hello, World!",
            content: "Welcome to the world of decorators."
        });

        // @ts-ignore for testing
        const [err4, res4] = _try(() => broadcaster.copy({
            title: "Hello, World!",
        }));
        strictEqual(res4, undefined);
        strictEqual((err4 as TypeError).name, "TypeError");
        strictEqual((err4 as TypeError).message,
            "validation failed at return value.content: required");

        // @ts-ignore for testing
        const [err5, res5] = _try(() => broadcaster.copy({
            title: "Hello, World!",
            // @ts-ignore for testing
            content: "123",
        }));
        strictEqual(res5, undefined);
        strictEqual((err5 as TypeError).name, "TypeError");
        strictEqual((err5 as TypeError).message,
            "validation failed at return value.content: expected string, received number");

        const res6 = await broadcaster.review({
            title: "Hello, World!",
            content: "Welcome to the world of decorators."
        });
        deepStrictEqual(res6, {
            title: "Hello, World!",
            content: "Welcome to the world of decorators."
        });

        // @ts-ignore for testing
        const [err7, res7] = await _try(async () => await broadcaster.review({
            title: "Hello, World!",
        }));
        strictEqual(res7, undefined);
        strictEqual((err7 as TypeError).name, "TypeError");
        strictEqual((err7 as TypeError).message,
            "validation failed at return value.content: required");

        // @ts-ignore for testing
        const [err8, res8] = await _try(async () => await broadcaster.review({
            title: "Hello, World!",
            // @ts-ignore for testing
            content: "123",
        }));
        strictEqual(res8, undefined);
        strictEqual((err8 as TypeError).name, "TypeError");
        strictEqual((err8 as TypeError).message,
            "validation failed at return value.content: expected string, received number");
    });

    it("throws", async () => {
        const calculator = new Calculator();

        strictEqual(calculator.divide(6, 2), 3);

        // @ts-ignore for testing
        const [err4, res4] = _try(() => calculator.divide(6, 0));
        strictEqual(res4, undefined);
        strictEqual((err4 as TypeError).name, "TypeError");
        strictEqual((err4 as TypeError).message,
            "validation failed at thrown value: not an instanceof RangeError");

        const broadcaster = new Broadcaster();

        const [err5, res5] = await _try(async () => await broadcaster.review({
            content: "Welcome to the world of decorators."
        }));
        strictEqual(res5, undefined);
        strictEqual((err5 as TypeError).name, "TypeError");
        strictEqual((err5 as TypeError).message,
            "validation failed at thrown value: not an instanceof TypeError");
    });
});

class Calculator {
    @param("a", z.number())
    @param("b", z.number())
    @returns(z.number())
    add(a: number, b: number): number {
        return a + b;
    }

    @param("a", z.number())
    @param("b", z.number())
    @returns(z.number())
    subtract(a: number, b: number): number {
        // @ts-ignore for testing
        return String(a - b);
    }

    @param("a", z.number())
    @param("b", z.number())
    @returns(z.number())
    times(a: number, b: number): number {
        return a * b;
    }

    @param("a", z.number())
    @param("b", z.number())
    @returns(z.number())
    @throws(z.instanceof(RangeError))
    divide(a: number, b: number): number {
        if (b === 0) {
            // @ts-ignore for testing
            throw new TypeError("Division by zero.");
        }

        return a / b;
    }
}

const News = z.object({
    title: z.string(),
    content: z.string(),
});
type News = z.infer<typeof News>;

class Broadcaster {
    @param("news", News)
    @returns(z.number())
    broadcast(news: News): number {
        return news.title.length + news.content.length;
    }

    @param("news", News.partial())
    @returns(News)
    copy(news: Partial<News>): News {
        const _news = { ...news } as News;

        if (/^\d+$/.test(_news.title)) {
            // @ts-ignore for testing
            _news.title = Number(_news.title);
        }

        if (/^\d+$/.test(_news.content)) {
            // @ts-ignore for testing
            _news.content = Number(_news.content);
        }

        return _news;
    }

    @param("news", News.partial())
    @returns(z.promise(News))
    @throws(z.instanceof(TypeError))
    async review(news: Partial<News>): Promise<News> {
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        const _news = { ...news } as News;

        if (/^\d+$/.test(_news.title)) {
            // @ts-ignore for testing
            _news.title = Number(_news.title);
        }

        if (/^\d+$/.test(_news.content)) {
            // @ts-ignore for testing
            _news.content = Number(_news.content);
        }

        if (!news.title) {
            // @ts-ignore for testing
            throw new Error("Title is required.");
        }

        return _news;
    }
}
