import { stripEnd } from "@ayonli/jsext/string";
import { stdin, stdout } from "node:process";
import { clearLine, moveCursor, createInterface } from "node:readline";

export async function alert(message: string) {
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });
    await new Promise<string>(resolve => {
        writer.question(message + " [Enter] ", resolve);
    });
    writer.close();
}

export async function confirm(message: string): Promise<boolean> {
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });
    const job = new Promise<string>(resolve => {
        writer.question(message + " [y/N] ", resolve);
    });

    const abort = new Promise<boolean>(resolve => {
        stdin.on?.("keypress", (key: string | undefined) => {
            if (key === undefined) {
                resolve(false);
            }
        });
    });

    let ok = await Promise.race([job, abort]);
    writer.close();

    if (typeof ok === "boolean") {
        return false;
    } else {
        ok = ok.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
}

export async function prompt(
    message: string,
    defaultValue: string | undefined = undefined
): Promise<string | null> {
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });
    const job = new Promise<string>(resolve => {
        writer.question(message + " ", resolve);
    });

    if (defaultValue) {
        writer.write(defaultValue);
    }

    const abort = new Promise<null>(resolve => {
        stdin.on?.("keypress", (key: string | undefined) => {
            if (key === undefined) {
                resolve(null);
            }
        });
    });

    const response = await Promise.race([job, abort]);
    writer.close();
    return response;
}

export async function loading(message: string, fn: () => Promise<string | void>) {
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });

    writer.write(stripEnd(message, "..."));
    const job = fn();

    let waitingIndicator = "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
            moveCursor(stdout, -2, 0);
            clearLine(stdin, 1);
        } else {
            waitingIndicator += ".";
            writer.write(".");
        }
    }, 1000);

    try {
        const result = await job;

        clearInterval(waitingTimer as any);

        if (result) {
            moveCursor(stdout, -writer.cursor, 0);
            clearLine(stdout, 1);

            writer.write(result + "\n");
        } else {
            writer.write("\n");
        }

        writer.close();
    } catch (err) {
        clearInterval(waitingTimer as any);
        writer.write("\n");
        writer.close();

        throw err;
    }
}
