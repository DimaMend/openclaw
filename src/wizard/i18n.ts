
import { zhCN } from "./locales/zh-CN.js";

const currentLocale = "zh-CN"; // Default to Chinese
const locales: Record<string, any> = {
    "zh-CN": zhCN,
};

export function t(key: string): string {
    const keys = key.split(".");
    let value = locales[currentLocale];
    for (const k of keys) {
        if (value && typeof value === "object") {
            value = value[k];
        } else {
            return key;
        }
    }
    return typeof value === "string" ? value : key;
}
