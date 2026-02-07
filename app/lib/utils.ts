
export function normalizeEmail(input: string): string {
    if (!input) return "";

    // 1. Lowercase + Trim
    let s = input.toLowerCase().trim();

    // 2. Map Turkish chars
    const map: Record<string, string> = {
        'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
        'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'İ': 'i', 'Ö': 'o', 'Ç': 'c'
    };

    s = s.replace(/[ğüşıöçĞÜŞİÖÇ]/g, (char) => map[char] || char);

    // 3. Remove spaces
    s = s.replace(/\s+/g, '');

    return s;
}

export function generateId(prefix = ""): string {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
