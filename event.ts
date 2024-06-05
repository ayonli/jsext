/**
 * Creates an `ErrorEvent` instance based on the given options. If the
 * `ErrorEvent` constructor is not available, the generic `Event` constructor
 * will be used instead, and the options will be attached to the event as its
 * properties.
 */
export function createErrorEvent(type: "close", options?: ErrorEventInit): ErrorEvent;
export function createErrorEvent(type: string, options?: ErrorEventInit): ErrorEvent;
export function createErrorEvent(type: string, options: ErrorEventInit = {}): ErrorEvent {
    if (typeof ErrorEvent === "function") {
        return new ErrorEvent(type, options);
    } else {
        const event = new Event(type, {
            bubbles: options?.bubbles ?? false,
            cancelable: options?.cancelable ?? false,
            composed: options?.composed ?? false,
        });

        Object.defineProperties(event, {
            message: { value: options?.message ?? "" },
            filename: { value: options?.filename ?? "" },
            lineno: { value: options?.lineno ?? 0 },
            colno: { value: options?.colno ?? 0 },
            error: { value: options?.error ?? undefined },
        });

        return event as ErrorEvent;
    }
}

/**
 * Creates a `CloseEvent` instance based on the given options. If the
 * `CloseEvent` constructor is not available, the generic `Event` constructor
 * will be used instead, and the options will be attached to the event as its
 * properties.
 */
export function createCloseEvent(type: "close", options?: CloseEventInit): CloseEvent;
export function createCloseEvent(type: string, options?: CloseEventInit): CloseEvent;
export function createCloseEvent(type: string, options: CloseEventInit = {}): CloseEvent {
    if (typeof CloseEvent === "function") {
        return new CloseEvent(type, options);
    } else {
        const event = new Event(type, {
            bubbles: options?.bubbles ?? false,
            cancelable: options?.cancelable ?? false,
            composed: options?.composed ?? false,
        });

        Object.defineProperties(event, {
            code: { value: options.code ?? 0 },
            reason: { value: options.reason ?? "" },
            wasClean: { value: options.wasClean ?? false },
        });

        return event as CloseEvent;
    }
}

/**
 * Creates a `ProgressEvent` instance based on the given options. If the
 * `ProgressEvent` constructor is not available, the generic `Event` constructor
 * will be used instead, and the options will be attached to the event as its
 * properties.
 */
export function createProgressEvent(type: "progress", options?: ProgressEventInit): ProgressEvent;
export function createProgressEvent(type: string, options?: ProgressEventInit): ProgressEvent;
export function createProgressEvent(type: string, options: ProgressEventInit = {}): ProgressEvent {
    if (typeof ProgressEvent === "function") {
        return new ProgressEvent(type, options);
    } else {
        const event = new Event(type, {
            bubbles: options?.bubbles ?? false,
            cancelable: options?.cancelable ?? false,
            composed: options?.composed ?? false,
        });

        Object.defineProperties(event, {
            lengthComputable: { value: options?.lengthComputable ?? false },
            loaded: { value: options?.loaded ?? 0 },
            total: { value: options?.total ?? 0 },
        });

        return event as ProgressEvent;
    }
}
