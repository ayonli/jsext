import { orderBy } from "../array.ts";
import { DirEntry } from "../fs.ts";
import { join } from "../path.ts";
import { dedent } from "../string.ts";

export async function respondDir(
    entries: DirEntry[],
    pathname: string,
    extraHeaders: HeadersInit = {}
): Promise<Response> {
    const list = [
        ...orderBy(
            entries.filter(e => e.kind === "directory"),
            e => e.name
        ).map(e => e.name + "/"),
        ...orderBy(
            entries.filter(e => e.kind === "file"),
            e => e.name
        ).map(e => e.name),
    ];

    if (pathname !== "/") {
        list.unshift("../");
    }

    const listHtml = list.map((name) => {
        let url = join(pathname, name);

        if (name.endsWith("/") && url !== "/") {
            url += "/";
        }

        return dedent`
            <li>
                <a href="${url}">${name}</a>
            </li>
            `;
    });

    return new Response(dedent`
                <!DOCTYPE HTML>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>Directory listing for ${pathname}</title>
                    <style>
                    body {
                        font-family: system-ui;
                    }
                    </style>
                </head>
                <body>
                    <h1>Directory listing for ${pathname}</h1>
                    <hr>
                    <ul>
                        ${listHtml.join("")}
                    </ul>
                </body>
                </html>
                `, {
        status: 200,
        statusText: "OK",
        headers: {
            ...extraHeaders,
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
