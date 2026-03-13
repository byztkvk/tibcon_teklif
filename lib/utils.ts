export function normalizeSehir(name: string): string {
    if (!name) return "";
    return name
        .trim()
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toUpperCase()
        .normalize('NFC');
}
