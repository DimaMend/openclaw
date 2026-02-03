import { locales, setLocale as setI18nLocale, getLocale, type Locale } from "../../../src/i18n/index.js";

export function getBestLocale(): Locale {
    // 1. Check navigator.languages
    if (typeof navigator !== "undefined" && navigator.languages) {
        for (const lang of navigator.languages) {
            if (lang.startsWith("zh")) {
                return "zh-CN";
            }
            if (lang.startsWith("en")) {
                return "en";
            }
        }
    }
    // 2. Default to en
    return "en";
}

export function initI18n(initialLocale?: Locale) {
    const locale = initialLocale || getBestLocale();
    setI18nLocale(locale);
}

export function setLocale(locale: Locale) {
    setI18nLocale(locale);
}

export function t() {
    return locales[getLocale()];
}
