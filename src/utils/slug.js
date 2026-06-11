import slugify from "slugify";

export function toSlug(s) {
    return slugify(String(s || ""), { lower: true, strict: true, trim: true });
}

export function shlokaId(sutraId, number) {
    const n = String(number).padStart(2, "0");
    return `${sutraId}/${n}`;
}

export function shlokaFileBase(shlokaId) {
    return shlokaId.replace(/\//g, "__");
}
