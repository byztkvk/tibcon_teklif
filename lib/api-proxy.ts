import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app.tibcon.com.tr";

async function getAuthHeader(existingHeaders?: HeadersInit): Promise<Record<string, string>> {
    let authHeader = (existingHeaders as any)?.["Authorization"];
    if (!authHeader) {
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("tibcon_token")?.value;
            if (token) {
                authHeader = `Bearer ${token}`;
            }
        } catch (e) {
            // Context not available or other error
        }
    }
    return authHeader ? { "Authorization": authHeader as string } : {};
}

export async function proxyGet(path: string, headers?: HeadersInit) {
    const authObj = await getAuthHeader(headers);
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...authObj,
            ...(headers as any),
        },
        cache: "no-store",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

export async function proxyPost(path: string, body: any, headers?: HeadersInit) {
    const authObj = await getAuthHeader(headers);
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authObj,
            ...(headers as any),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

export async function proxyPut(path: string, body: any, headers?: HeadersInit) {
    const authObj = await getAuthHeader(headers);
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...authObj,
            ...(headers as any),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

export async function proxyDelete(path: string, headers?: HeadersInit) {
    const authObj = await getAuthHeader(headers);
    const res = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: {
            ...authObj,
            ...(headers as any),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}
