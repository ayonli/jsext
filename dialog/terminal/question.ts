import bytes, { concat, equals } from "../../bytes/index.ts";
import { chars } from "../../string/index.ts";
import {
    BS,
    CLR_RIGHT,
    CR,
    DEL,
    DOWN,
    END,
    LEFT,
    LF,
    RIGHT,
    START,
    UP,
} from "./constants.ts";
import {
    DenoStdin,
    DenoStdout,
    NodeStdin,
    NodeStdout,
    isCancelEvent,
    read,
    toLeft,
    toRight,
    write,
} from "./util.ts";

function getMasks(mask: string, length: number): string {
    return new Array<string>(length).fill(mask).join("");
}

export default async function question(message: string, options: {
    stdin: NodeStdin | DenoStdin;
    stdout: NodeStdout | DenoStdout;
    defaultValue?: string | undefined;
    mask?: string | undefined;
}) {
    const { stdin, stdout, defaultValue = "", mask } = options;
    const buf: string[] = [];
    let cursor = 0;

    await write(stdout, bytes(message));

    if (defaultValue) {
        const _chars = chars(defaultValue);
        buf.push(..._chars);
        cursor += _chars.length;

        if (mask === undefined) {
            await write(stdout, bytes(defaultValue));
        } else if (mask) {
            await write(stdout, bytes(getMasks(mask, _chars.length)));
        }
    }

    while (true) {
        const input = await read(stdin);

        if (!input.length || equals(input, UP) || equals(input, DOWN)) {
            continue;
        } else if (equals(input, LEFT)) {
            if (cursor > 0) {
                const char = buf[--cursor]!;

                if (mask === undefined) {
                    await write(stdout, toLeft(char));
                } else if (mask) {
                    await write(stdout, toLeft(mask));
                }
            }
        } else if (equals(input, RIGHT)) {
            if (cursor < buf.length) {
                const char = buf[cursor++]!;

                if (mask === undefined) {
                    await write(stdout, toRight(char));
                } else if (mask) {
                    await write(stdout, toRight(mask));
                }
            }
        } else if (equals(input, START)) {
            const left = buf.slice(0, cursor);

            if (left.length) {
                cursor = 0;

                if (mask === undefined) {
                    await write(stdout, toLeft(left.join("")));
                } else if (mask) {
                    await write(stdout, toLeft(getMasks(mask, left.length)));
                }
            }
        } else if (equals(input, END)) {
            const right = buf.slice(cursor);

            if (right.length) {
                cursor = buf.length;

                if (mask === undefined) {
                    await write(stdout, toRight(right.join("")));
                } else if (mask) {
                    await write(stdout, toRight(getMasks(mask, right.length)));
                }
            }
        } else if (isCancelEvent(input)) {
            await write(stdout, LF);
            return null;
        } else if (equals(input, CR) || equals(input, LF)) {
            await write(stdout, LF);
            return buf.join("");
        } else if (equals(input, BS) || equals(input, DEL)) {
            if (cursor > 0) {
                cursor--;
                const [char] = buf.splice(cursor, 1);
                const rest = buf.slice(cursor);

                if (mask === undefined) {
                    await write(stdout, toLeft(char!));
                    await write(stdout, CLR_RIGHT);

                    if (rest.length) {
                        const output = rest.join("");
                        await write(stdout, bytes(output));
                        await write(stdout, toLeft(output));
                    }
                } else if (mask) {
                    await write(stdout, toLeft(mask));
                    await write(stdout, CLR_RIGHT);

                    if (rest.length) {
                        const output = getMasks(mask, rest.length);
                        await write(stdout, bytes(output));
                        await write(stdout, toLeft(output));
                    }
                }
            }
        } else {
            const _chars = chars(String(input));

            if (cursor === buf.length) {
                buf.push(..._chars);
                cursor += _chars.length;

                if (mask === undefined) {
                    await write(stdout, input);
                } else if (mask) {
                    await write(stdout, bytes(getMasks(mask, _chars.length)));
                }
            } else {
                buf.splice(cursor, 0, ..._chars);
                cursor += _chars.length;

                if (mask === undefined) {
                    const rest = buf.slice(cursor).join("");

                    await write(stdout, concat(input, bytes(rest)));
                    await write(stdout, toLeft(rest));
                } else if (mask) {
                    const output = getMasks(mask, _chars.length);
                    const rest = getMasks(mask, buf.slice(cursor).length);

                    await write(stdout, bytes(output + rest));
                    await write(stdout, toLeft(rest));
                }
            }
        }
    }
}