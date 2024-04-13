/**
 * Functions to get file types in different fashions.
 * @module
 */
import { UTIMap } from "./filetype/constants.ts";

/**
 * Returns the corresponding UTI (Uniform Type Identifier) for the given
 * type, where the type is a file extension or a MIME type name.
 */
export function getUTI(type: string): string | undefined {
    type = type.toLowerCase();

    if (type.startsWith("*.")) {
        type = type.slice(1);
    }

    for (const [uti, values] of Object.entries(UTIMap)) {
        if (values.includes(type)) {
            return uti;
        }
    }

    return undefined;
}

/**
 * Returns the corresponding MIME type for the given type, where the type is a
 * file extension or a UTI (Uniform Type Identifier) name.
 */
export function getMIME(type: string): string | undefined {
    type = type.toLowerCase();

    if (type.startsWith("*.")) {
        type = type.slice(1);
    }

    if (type[0] !== ".") {
        const values = UTIMap[type] || null;
        return values ? values.find(v => v.includes("/")) : undefined;
    }

    for (const values of Object.values(UTIMap)) {
        if (values.includes(type)) {
            const mime = values.find(v => v.includes("/"));

            if (mime) {
                return mime;
            }
        }
    }

    return undefined;
}

/**
 * Returns the corresponding file extensions for the given type, where the type
 * is a MIME type or a UTI (Uniform Type Identifier) name.
 */
export function getExtensions(type: string): string[] {
    type = type.toLowerCase();

    if (type.startsWith("*.")) {
        type = type.slice(1);
    }

    if (type[0] === ".") {
        return [type];
    }

    if (type[0] !== "." && !type.includes("/")) {
        const values = UTIMap[type] || null;
        return values ? values.filter(v => v[0] === ".") : [];
    }

    if (type.endsWith("/*")) {
        const _type = type.slice(0, -1);
        return Object.values(UTIMap)
            .filter(values => values.some(v => v !== type && v.startsWith(_type)))
            .map(values => values.filter(v => v[0] === "."))
            .flat();
    }

    for (const types of Object.values(UTIMap)) {
        if (types.includes(type)) {
            return types.filter(t => t.startsWith("."));
        }
    }

    return [];
}
