self.addEventListener("message", async ({ data: msg }) => {
    if (msg && typeof msg === "object" &&
        msg.type === "ffi" &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args)
    ) {
        try {
            const module = await import(msg.script);
            const value = await module[msg.fn](...msg.args);
            self?.postMessage({
                type: "result",
                value,
                error: null,
            });
        } catch (error) {
            self?.postMessage({
                type: "result",
                value: undefined,
                error,
            });
        }
    }
});
