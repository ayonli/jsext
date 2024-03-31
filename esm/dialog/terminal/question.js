import bytes, { equals, concat } from '../../bytes/index.js';
import { chars } from '../../string/index.js';
import { UP, DOWN, LEFT, RIGHT, START, END, LF, CR, BS, DEL, CLR_RIGHT } from './constants.js';
import { write, read, toLeft, toRight, isCancelEvent } from './util.js';

async function question(stdin, stdout, message, defaultValue = "") {
    const buf = [];
    let cursor = 0;
    await write(stdout, bytes(message));
    if (defaultValue) {
        await write(stdout, bytes(defaultValue));
        const _chars = chars(defaultValue);
        buf.push(..._chars);
        cursor += _chars.length;
    }
    while (true) {
        const input = await read(stdin);
        if (!input.length || equals(input, UP) || equals(input, DOWN)) {
            continue;
        }
        else if (equals(input, LEFT)) {
            if (cursor > 0) {
                const char = buf[--cursor];
                await write(stdout, toLeft(char));
            }
        }
        else if (equals(input, RIGHT)) {
            if (cursor < buf.length) {
                const char = buf[cursor++];
                await write(stdout, toRight(char));
            }
        }
        else if (equals(input, START)) {
            const left = buf.slice(0, cursor);
            if (left.length) {
                cursor = 0;
                await write(stdout, toLeft(left.join("")));
            }
        }
        else if (equals(input, END)) {
            const right = buf.slice(cursor);
            if (right.length) {
                cursor = buf.length;
                await write(stdout, toRight(right.join("")));
            }
        }
        else if (isCancelEvent(input)) {
            await write(stdout, LF);
            return null;
        }
        else if (equals(input, CR) || equals(input, LF)) {
            await write(stdout, LF);
            return buf.join("");
        }
        else if (equals(input, BS) || equals(input, DEL)) {
            if (cursor > 0) {
                cursor--;
                const [char] = buf.splice(cursor, 1);
                const rest = buf.slice(cursor);
                await write(stdout, toLeft(char));
                await write(stdout, CLR_RIGHT);
                if (rest.length) {
                    const output = rest.join("");
                    await write(stdout, bytes(output));
                    await write(stdout, toLeft(output));
                }
            }
        }
        else {
            const _chars = chars(String(input));
            if (cursor === buf.length) {
                buf.push(..._chars);
                cursor += _chars.length;
                await write(stdout, input);
            }
            else {
                buf.splice(cursor, 0, ..._chars);
                cursor += _chars.length;
                const rest = buf.slice(cursor).join("");
                await write(stdout, concat(input, bytes(rest)));
                await write(stdout, toLeft(rest));
            }
        }
    }
}

export { question as default };
//# sourceMappingURL=question.js.map
