globalThis.matchMedia = window.matchMedia = (query) => {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        addEventListener: () => { },
        removeListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true,
    };
};
