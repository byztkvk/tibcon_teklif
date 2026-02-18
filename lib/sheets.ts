// lib/sheets.ts (Root Version)
const API = process.env.NEXT_PUBLIC_SHEETS_API_URL || "https://script.google.com/macros/s/AKfycbwgEtV6V3AjNYF8IL3q2W9uixMUhB5DOCBDnZGlVUDoMvE_5K7Yu5jMd5fXg71Ca-kQ5w/exec";

async function getJSON(url: string) {
  console.log("[lib/sheets] Fetching:", url);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("[lib/sheets] Fetch failed:", res.status, res.statusText);
      const text = await res.text();
      console.error("[lib/sheets] Response text:", text);
      return null;
    }
    const data = await res.json().catch((e) => {
      console.error("[lib/sheets] JSON Parse error:", e);
      return null;
    });
    console.log("[lib/sheets] Parsed Data:", data);
    return data;
  } catch (e) {
    console.error("[lib/sheets] Network error:", e);
    return null;
  }
}

async function postJSON(body: any) {
  try {
    const res = await fetch(API, {
      method: "POST",
      // Use text/plain to avoid Preflight OPTIONS request which GAS doesn't support
      // The body is still JSON string, and GAS will parse it fine.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      console.error("[lib/sheets] JSON Parse error. Raw text:", text);
      return { ok: false, message: "Sunucu hatası (JSON parse): " + text.substring(0, 150) };
    }
  } catch (e: any) {
    console.error("[lib/sheets] POST error:", e);
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
  return postJSON({ action: "getNextQuoteNo" });
}

export async function listUsers(): Promise<{ users: SheetUser[] } | null> {
  return postJSON({ action: "listUsers" });
}

export async function listProducts(): Promise<{ products: Product[] } | null> {
  return postJSON({ action: "listProducts" });
}

export async function upsertUser(payload: any) {
  const mappedPayload = {
    action: "upsertUser",
    email: normalizeEmail(payload.email || payload.id),
    name: payload.displayName || payload.fullName || payload.name,
    role: payload.role,
    region: payload.region || "",
    managerEmail: payload.managerEmail ? normalizeEmail(payload.managerEmail) : "",
    password: payload.password,
    active: payload.active
  };
  return postJSON(mappedPayload);
}

export async function listMappings(): Promise<{ harmonicMap: HarmonicMapping[]; protectionMap: ProtectionMapping[] } | null> {
  return postJSON({ action: "listMappings" });
}

export async function deleteUser(email: string) {
  return postJSON({ action: "deleteUser", email: normalizeEmail(email) });
}



export async function saveQuote(payload: { quote: any; rows: any[] }) {
  return postJSON({ action: "saveQuote", ...payload });
}

export async function listQuotes(): Promise<{ quotes: any[] } | null> {
  return postJSON({ action: "listQuotes" });
}

export async function getQuoteDetail(id: string): Promise<{ quote: any } | null> {
  return postJSON({ action: "getQuoteDetail", id });
}

export async function updateQuoteStatus(id: string, status: string) {
  return postJSON({ action: "updateQuoteStatus", id, status });
}

export async function listTerms(): Promise<{ terms: QuoteTerm[] } | null> {
  return postJSON({ action: "listTerms" });
}

export async function saveTerm(term: QuoteTerm) {
  return postJSON({ action: "saveTerm", term });
}

// --- SETTINGS ---
export async function getSettings() {
  return postJSON({ action: "getSettings" });
}

export async function saveSettings(settings: any) {
  return postJSON({ action: "saveSettings", settings });
}

// --- VISIT MODULE ---
export async function listSalesPoints(params: any = {}): Promise<{ points: any[] } | null> {
  return postJSON({ action: "listSalesPoints", ...params });
}

export async function addSalesPoint(payload: any) {
  return postJSON({ action: "addSalesPoint", ...payload });
}

export async function addVisit(payload: any) {
  return postJSON({ action: "addVisit", ...payload });
}

export async function listVisits(): Promise<{ visits: any[] } | null> {
  return postJSON({ action: "listVisits" });
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
export async function listRegions(): Promise<{ regions: string[] } | null> {
  return postJSON({ action: "listRegions" });
}

export async function addRegion(region: string) {
  return postJSON({ action: "addRegion", region });
}

export async function deleteRegion(region: string) {
  return postJSON({ action: "deleteRegion", region });
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
