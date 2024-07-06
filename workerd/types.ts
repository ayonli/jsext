export interface KVNamespace {
    get(key: string, options?: { type?: "text"; }): Promise<string | null>;
    get(key: string, options: { type: "json"; }): Promise<any | null>;
    get(key: string, options: { type: "arrayBuffer"; }): Promise<ArrayBuffer | null>;
    get(key: string, options: { type?: "stream"; }): Promise<ReadableStream | null>;
    put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: {
        prefix?: string;
        limit?: number;
        cursor?: string;
    }): Promise<{
        keys: { name: string; expiration?: number; }[];
        list_complete: boolean;
        cursor: string | null;
    }>;
}
