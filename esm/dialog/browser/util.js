function useColorTheme() {
    if (typeof window.matchMedia === "function") {
        const result = window.matchMedia("(prefers-color-scheme: dark)");
        const theme = result.matches ? "dark" : "light";
        return {
            theme,
            onChange: (callback) => {
                result.addEventListener("change", () => {
                    callback(result.matches ? "dark" : "light");
                });
            }
        };
    }
    else {
        return {
            theme: "light",
            onChange: (_) => {
            }
        };
    }
}
function i18n(locale) {
    let lang = "en";
    if (typeof navigator === "object" && typeof navigator.language === "string") {
        lang = navigator.language.split("-")[0];
    }
    return locale[lang] || locale["en"];
}

export { i18n, useColorTheme };
//# sourceMappingURL=util.js.map
