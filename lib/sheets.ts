// lib/sheets.ts - .NET Backend Version

// In production, we assume the API is exposed correctly under the same domain
// via IIS reverse proxy mappings or via external URL
const APIUrl = process.env.NEXT_PUBLIC_API_URL || "https://app.tibcon.com.tr";
const API = APIUrl;
const INTERNAL_API = "/api";

async function getHeaders(isInternal: boolean) {
  let headers: any = { "Content-Type": "application/json" };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("tibcon_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function getJSON(url: string) {
  const isInternal = url.startsWith(INTERNAL_API);
  const targetUrl = isInternal ? `${API}${url}` : url;

  console.log("[lib/sheets] Fetching:", targetUrl);
  try {
    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: await getHeaders(isInternal)
    });

    if (res.status === 401) {
      // Handle unauthorized (maybe redirect to login or refresh)
      console.error("Unauthorized request");
    }

    if (!res.ok) {
      console.error("[lib/sheets] Fetch failed:", res.status);
      return { ok: false, error: "not_found", status: res.status };
    }
    const data = await res.json();
    return { ...data, ok: true, success: true }; // Normalizing for existing frontend
  } catch (e) {
    console.error("[lib/sheets] Network error:", e);
    return null;
  }
}

async function postJSON(body: any, url: string = API) {
  try {
    const isInternal = url.startsWith(INTERNAL_API) || url === API;
    const targetUrl = (url === API) ? `${API}/api/legacy` : (url.startsWith(INTERNAL_API) ? `${API}${url}` : url);

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: await getHeaders(isInternal),
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      console.error("Unauthorized request");
    }

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return { ...data, ok: true, success: true }; // Normalizing
    } catch (e) {
      return { ok: false, message: "Sunucu hatası: " + text.substring(0, 50) };
    }
  } catch (e: any) {
    return { ok: false, message: "Bağlantı hatası: " + (e.message || String(e)) };
  }
}

async function putJSON(url: string, body: any) {
  try {
    const isInternal = url.startsWith(INTERNAL_API);
    const targetUrl = `${API}${url}`;

    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: await getHeaders(isInternal),
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, message: "Bağlantı hatası: " + (e.message || String(e)) };
  }
}

export function normalizeEmail(email: string) {
  const map: Record<string, string> = {
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ı": "i", "İ": "i",
    "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
  };
  return (email || "")
    .trim()
    .toLowerCase()
    .split("")
    .map(ch => map[ch] ?? ch)
    .join("");
}

// Types
export type Role = "sales" | "region_manager" | "quote_manager" | "admin";

export type Product = {
  mainCategory: string;
  groupCode?: string;
  orderCode: string;
  productCode: string;
  name: string;
  listPrice: number | string;
  currency?: "TRY" | "USD";
  kvar?: number | string;
  voltage?: number | string;
  pPct?: number | string;
  ampA?: number | string;
  type?: string;
};

export type HarmonicMapping = {
  gridV: number;
  pPct: number;
  capV: number;
};

export type ProtectionMapping = {
  capOrderCode: string;
  nhFuseA: number;
  mccbA: number;
  contactorCode: string;
};

export type SheetUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  region?: string;
  regionId?: string;
  regionIds?: string[];
  managerEmail?: string;
  password?: string;
  active?: boolean;
};

export type User = SheetUser;

export type Settings = {
  defaultDiscountPct?: string | number;
  regions?: string; // or regionsCsv
};

export type QuoteTerm = string;

export type AgendaItem = {
  id: string;
  salesPointId?: string;
  type: "NOTE" | "TASK";
  date: string;
  content: string;
  status: "OPEN" | "DONE";
  createdBy: string;
  createdAt: string;
  category?: string;
  lat?: number;
  lng?: number;
};

// API Functions
export async function ping() {
  return postJSON({ action: "ping" });
}

export async function getNextQuoteNo() {
  // Logic shifted to server handle auto-id or custom sequence in Firestore
  return { ok: true, quoteNo: "Q-" + Date.now() };
}

export async function listUsers(): Promise<{ users: SheetUser[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/users`);
  if (result && result.success) {
    return { users: result.users || result.data || [] };
  }
  return null;
}

export async function listProducts(): Promise<{ products: Product[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/products`);
  if (result && result.success) return { products: result.data || [] };
  return null;
}

export async function upsertUser(payload: any) {
  const mappedPayload = {
    email: normalizeEmail(payload.email || payload.id),
    displayName: payload.displayName || payload.fullName || payload.name,
    role: payload.role,
    isActive: payload.active !== false,
    passwordHash: payload.password // This will be hashed on server if present
  };
  
  const res = await fetch(`${API}${INTERNAL_API}/users`, {
    method: "POST",
    headers: await getHeaders(true),
    body: JSON.stringify(mappedPayload)
  });
  return await res.json();
}

export async function listMappings(): Promise<{ harmonicMap: HarmonicMapping[]; protectionMap: ProtectionMapping[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/mappings`);
  if (result && result.success) return result.data;
  return null;
}

export async function deleteUser(id: number | string) {
  const res = await fetch(`${API}${INTERNAL_API}/users/${id}`, {
    method: "DELETE",
    headers: await getHeaders(true)
  });
  return await res.json();
}


// --- QUOTES (FIRESTORE ROUTED) ---

export async function saveQuote(payload: { quote: any; rows: any[] }) {
  // Map rows to items as expected by Firestore structure
  // Frontend sends: code, listPrice, qty, discountPct, name, currency
  const items = payload.rows.map(r => {
    const listPrice = Number(r.listPrice) || Number(r.price) || 0;
    const qty = Number(r.qty) || Number(r.quantity) || 0;
    const discount = Number(r.discountPct) || Number(r.discount) || 0;
    const lineTotal = (listPrice * qty) * (1 - discount / 100);

    return {
      productId: r.code || r.productId || r.productCode || r.orderCode || "",
      productCode: r.code || r.productCode || r.productId || "",
      name: r.name || "",
      currency: r.currency || "TRY",
      quantity: qty,
      price: listPrice,
      discount: discount,
      lineTotal: Number(r.lineTotal) || lineTotal
    };
  });

  const result = await postJSON({ quote: payload.quote, items }, `${INTERNAL_API}/quotes`);
  if (result && result.success) {
    return { ok: true, id: result.id };
  }
  return { ok: false, message: result?.error || "Kayıt başarısız" };
}

export async function listQuotes(): Promise<{ quotes: any[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/quotes`);
  if (result && result.success) {
    return { quotes: result.data };
  }
  return null;
}

export async function getQuoteDetail(id: string): Promise<{ quote: any } | null> {
  const result = await getJSON(`${INTERNAL_API}/quotes/${id}`);
  if (result && result.success) {
    return { quote: result.data };
  }
  return null;
}

export async function updateQuoteStatus(id: string, status: string) {
  const result = await putJSON(`${INTERNAL_API}/quotes/${id}`, { status });
  if (result && result.success) {
    return { ok: true };
  }
  return { ok: false, message: result?.error || "Güncelleme başarısız" };
}

// --- /QUOTES ---

export async function listTerms(): Promise<{ terms: QuoteTerm[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/settings/terms`);
  if (result && result.success) return { terms: result.data || [] };
  return null;
}

export async function saveTerm(term: QuoteTerm) {
  return postJSON({ action: "saveTerm", term });
}

// --- SETTINGS ---
export async function getSettings() {
  return getJSON(`${INTERNAL_API}/settings`);
}

export async function saveSettings(settings: any) {
  return postJSON(settings, `${INTERNAL_API}/settings`);
}

// --- VISIT MODULE ---
export async function listSalesPoints(params: any = {}): Promise<{ points: any[] } | null> {
  const qs = new URLSearchParams(params).toString();
  const result = await getJSON(`${INTERNAL_API}/salesPoints?${qs}`);
  if (result && result.success) return { points: result.data || [] };
  return null;
}

export async function addSalesPoint(payload: any) {
  return postJSON(payload, `${INTERNAL_API}/salesPoints`);
}

export async function addVisit(payload: any) {
  const result = await postJSON(payload, `${INTERNAL_API}/visits`);
  return result;
}

export async function listVisits(): Promise<{ visits: any[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/visits`);
  if (result && result.ok) return { visits: result.visits || [] };
  return { visits: [] };
}

// Visit Plan Functions
export async function listVisitPlans(): Promise<{ plans: any[] } | null> {
  return postJSON({ action: "listVisitPlans" });
}

export async function addVisitPlan(payload: any) {
  return postJSON({ action: "addVisitPlan", ...payload });
}

export async function updateVisitPlanStatus(payload: { id: string, status: string }) {
  return postJSON({ action: "updateVisitPlanStatus", ...payload });
}

export async function updateVisitPlanDate(payload: { id: string, plannedDate: string }) {
  return postJSON({ action: "updateVisitPlanDate", ...payload });
}

// Region Management Functions
export async function listRegions(): Promise<{ regions: any[] } | null> {
  const result = await getJSON(`${INTERNAL_API}/regions`);
  if (result && result.success) return { regions: result.data || [] };
  return null;
}

export async function addRegion(payload: any) {
  return postJSON(payload, `${INTERNAL_API}/regions`);
}

export async function deleteRegion(id: string) {
  const res = await fetch(`${API}${INTERNAL_API}/regions/${id}`, {
    method: "DELETE",
    headers: await getHeaders(true)
  });
  return await res.json();
}

export async function requestPlanChange(payload: { id: string, newDate: string, note: string }) {
  return postJSON({ action: "requestPlanChange", ...payload });
}

export async function resolvePlanChange(payload: { id: string, decision: "APPROVED" | "REJECTED" }) {
  return postJSON({ action: "resolvePlanChange", ...payload });
}

// --- AGENDA FUNCTIONS ---
export async function listAgenda(email: string): Promise<{ items: AgendaItem[] } | null> {
  return postJSON({ action: "listAgenda", email });
}

export async function saveAgendaItem(item: Partial<AgendaItem>) {
  return postJSON({ action: "saveAgendaItem", ...item });
}

export async function deleteAgendaItem(id: string) {
  return postJSON({ action: "deleteAgendaItem", id });
}
