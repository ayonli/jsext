export interface KVNamespace {
    get(key: string, options?: { type?: "text"; }): Promise<string | null>;
    get(key: string, options: { type: "json"; }): Promise<any | null>;
    get(key: string, options: { type: "arrayBuffer"; }): Promise<ArrayBuffer | null>;
    get(key: string, options: { type?: "stream"; }): Promise<ReadableStream | null>;
    getWithMetadata(key: string, options?: { type?: "text"; }): Promise<{
        value: string | null;
        metadata: { [x: string]: any; };
    }>;
    getWithMetadata(key: string, options: { type: "json"; }): Promise<{
        value: any | null;
        metadata: { [x: string]: any; };
    }>;
    getWithMetadata(key: string, options: { type: "arrayBuffer"; }): Promise<{
        value: ArrayBuffer | null;
        metadata: { [x: string]: any; };
    }>;
    getWithMetadata(key: string, options: { type?: "stream"; }): Promise<{
        value: ReadableStream | null;
        metadata: { [x: string]: any; };
    }>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: {
        expiration?: number;
        expirationTtl?: number;
        metadata?: { [x: string]: any; };
    }): Promise<void>;
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
