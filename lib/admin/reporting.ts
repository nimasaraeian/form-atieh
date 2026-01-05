export type RawPerson = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  createdAt?: string;
  created_at?: string;
};

export type RawPayment = {
  id?: string | number;
  type?: string;
  name?: string;
  score?: number | string;
  description?: string;
  priority?: number;
  delay?: string;
  createdAt?: string;
  created_at?: string;
};

export type RawTreatment = {
  id?: string | number;
  name?: string;
  profitability?: string;
  cost?: number | string;
  price?: number | string;
  description?: string;
  createdAt?: string;
  created_at?: string;
};

export type RawDoctor = {
  id?: string | number;
  name?: string;
  doctorName?: string;
  specialty?: string;
};

export type RawAdminData = {
  persons?: RawPerson[];
  people?: RawPerson[];
  payments?: RawPayment[];
  paymentTypes?: RawPayment[];
  treatments?: RawTreatment[];
  doctors?: RawDoctor[];
  [key: string]: unknown;
};

export type DataSource =
  | "api-export"
  | "api-data"
  | "local-storage"
  | "manual-import"
  | "none";

export type CleanDoctor = {
  name: string;
  specialty: string;
  notes?: string;
};

export type CleanTreatment = {
  name: string;
  profitability: string;
  profitabilityLabel: string;
  cost: string;
  notes?: string;
};

export type CleanPayment = {
  name: string;
  bestScore: number;
  stars: string;
  delay?: string;
  notes?: string;
};

export type CleanPerson = {
  name: string;
  firstSeen?: string;
  submissions: number;
};

export type ReportData = {
  doctors: CleanDoctor[];
  treatments: CleanTreatment[];
  payments: CleanPayment[];
  people: CleanPerson[];
  kpis: {
    totalPeople: number;
    totalPaymentTypes: number;
    totalTreatments: number;
    totalDoctors: number;
  };
  charts: {
    paymentsByScore: CleanPayment[];
    treatmentProfitBuckets: { name: string; value: number }[];
    doctorsBySpecialty: { name: string; value: number }[];
  };
};

const profitabilityLabels: Record<string, string> = {
  "very-high": "خیلی پرسود",
  high: "پرسود",
  medium: "متوسط",
  low: "کم‌سود"
};

const specialtyKeywords: Record<string, string[]> = {
  عمومی: ["عمومی"],
  "ترمیمی و زیبایی": ["ترمیم", "زیبایی"],
  ارتودنسی: ["ارتودنسی"],
  "پریو/ایمپلنت": ["پریو", "لثه", "ایمپلنت"],
  "درمان ریشه (اندو)": ["ریشه", "اندو"],
  اطفال: ["اطفال"],
  "فک و صورت": ["فک", "صورت"]
};

const profitabilityOrder = ["very-high", "high", "medium", "low"];

export function normalizeText(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value
    .replace(/\u064A/g, "ی") // ي -> ی
    .replace(/\u0643/g, "ک") // ك -> ک
    .replace(/\s+/g, " ")
    .trim();
  return trimmed;
}

export function normalizeName(value: string | undefined | null): string {
  return normalizeText(value).toLowerCase();
}

function scoreToStars(score: number): string {
  if (score >= 10) return "5⭐";
  if (score === 9) return "4.5⭐";
  if (score === 8) return "4⭐";
  if (score === 7) return "3⭐";
  if (score >= 5) return "2⭐";
  return "1⭐";
}

function mapProfitability(label: string | undefined): {
  key: string;
  display: string;
} {
  const key = (label || "medium").toLowerCase();
  return {
    key,
    display: profitabilityLabels[key] || label || "متوسط"
  };
}

function parseSpecialty(name: string, explicit?: string): string {
  const fromExplicit = normalizeText(explicit);
  if (fromExplicit) return fromExplicit;

  const normalized = normalizeText(name);
  for (const [label, keywords] of Object.entries(specialtyKeywords)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return label;
    }
  }
  return "نامشخص";
}

function splitPaymentNames(raw: string): { names: string[]; bundleNote?: string } {
  const cleaned = normalizeText(raw);
  if (!cleaned) return { names: ["نامشخص"] };
  const parts = cleaned
    .split(/[–—\-،,/]+| و /g)
    .map((p) => normalizeText(p))
    .filter(Boolean);
  if (parts.length <= 1) {
    return { names: [cleaned] };
  }
  return { names: parts, bundleNote: cleaned };
}

function inferDelay(description?: string): string | undefined {
  if (!description) return undefined;
  const desc = normalizeText(description);
  if (/چک/i.test(desc) || desc.includes("چک")) return "نیازمند زمان‌بندی (چک)";
  if (desc.includes("قسط") || /installment/i.test(desc)) return "اقساطی";
  if (desc.includes("نقد") || /cash/i.test(desc)) return "بدون تأخیر";
  return undefined;
}

function formatCost(value: number | string | undefined | null): {
  display: string;
  needsReview?: boolean;
} {
  if (value === null || value === undefined) return { display: "-" };
  const str = typeof value === "number" ? value.toString() : normalizeText(value);
  const numeric = Number(str.replace(/,/g, ""));
  if (Number.isFinite(numeric)) {
    const formatter = new Intl.NumberFormat("fa-IR");
    const needsReview = numeric > 0 && numeric < 1000;
    return { display: formatter.format(numeric), needsReview };
  }
  return { display: str || "-", needsReview: false };
}

function earliestDate(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const da = new Date(a);
  const db = new Date(b);
  return da <= db ? a : b;
}

export function prepareReport(raw: RawAdminData | null | undefined): ReportData {
  const persons = raw?.persons || raw?.people || [];
  const payments = raw?.payments || raw?.paymentTypes || [];
  const treatments = raw?.treatments || [];
  const doctors = raw?.doctors || [];

  const doctorMap = new Map<string, CleanDoctor>();
  doctors.forEach((doc) => {
    const name = normalizeText(doc.name || doc.doctorName || "");
    if (!name) return;
    const key = normalizeName(name);
    const specialty = parseSpecialty(name, doc.specialty);
    if (!doctorMap.has(key)) {
      doctorMap.set(key, { name, specialty });
    }
  });

  const treatmentMap = new Map<string, CleanTreatment>();
  treatments.forEach((t) => {
    const name = normalizeText(t.name);
    if (!name) return;
    const key = normalizeName(name);
    const profitability = mapProfitability(t.profitability);
    const costInfo = formatCost(t.cost ?? t.price);
    const existing = treatmentMap.get(key);
    const notes = [];
    if (costInfo.needsReview) notes.push("نیاز به اصلاح");
    if (normalizeText(t.description)) notes.push(normalizeText(t.description));

    if (!existing) {
      treatmentMap.set(key, {
        name,
        profitability: profitability.key,
        profitabilityLabel: profitability.display,
        cost: costInfo.display,
        notes: notes.join("؛ ") || undefined
      });
      return;
    }

    // Keep the more profitable entry
    const currentIdx = profitabilityOrder.indexOf(existing.profitability);
    const newIdx = profitabilityOrder.indexOf(profitability.key);
    if (newIdx !== -1 && (currentIdx === -1 || newIdx < currentIdx)) {
      existing.profitability = profitability.key;
      existing.profitabilityLabel = profitability.display;
    }
    if (existing.cost === "-" && costInfo.display !== "-") {
      existing.cost = costInfo.display;
    }
    if (costInfo.needsReview && !existing.notes?.includes("نیاز به اصلاح")) {
      existing.notes = [existing.notes, "نیاز به اصلاح"].filter(Boolean).join("؛ ");
    }
    if (normalizeText(t.description) && !existing.notes?.includes(normalizeText(t.description))) {
      existing.notes = [existing.notes, normalizeText(t.description)].filter(Boolean).join("؛ ");
    }
  });

  const paymentMap = new Map<string, CleanPayment>();
  payments.forEach((p) => {
    const rawName = p.type || p.name || "";
    const { names, bundleNote } = splitPaymentNames(rawName);
    const scoreNumber = Number(p.score ?? 0);
    names.forEach((name) => {
      const key = normalizeName(name);
      const existing = paymentMap.get(key);
      const bestScore = Number.isFinite(scoreNumber) ? scoreNumber : 0;
      const delay = inferDelay(p.delay || p.description);
      const notes: string[] = [];
      if (bundleNote && bundleNote !== name) {
        notes.push(`بخشی از: ${bundleNote}`);
      }
      if (delay && !notes.includes(delay)) {
        notes.push(delay);
      }
      if (!existing) {
        paymentMap.set(key, {
          name,
          bestScore,
          stars: scoreToStars(bestScore),
          delay,
          notes: notes.join("؛ ") || undefined
        });
        return;
      }
      if (bestScore > existing.bestScore) {
        existing.bestScore = bestScore;
        existing.stars = scoreToStars(bestScore);
      }
      if (delay && !existing.delay) {
        existing.delay = delay;
      }
      const mergedNotes = [existing.notes, notes.join("؛ ")].filter(Boolean);
      existing.notes = mergedNotes.length ? Array.from(new Set(mergedNotes.join("؛ ").split("؛ "))).join("؛ ") : undefined;
    });
  });

  const peopleMap = new Map<string, CleanPerson>();
  persons.forEach((person) => {
    const full = normalizeText(
      person.fullName ||
        person.name ||
        `${person.firstName || ""} ${person.lastName || ""}`
    );
    if (!full) return;
    const key = normalizeName(full);
    const firstSeen = person.createdAt || person.created_at;
    const existing = peopleMap.get(key);
    if (!existing) {
      peopleMap.set(key, { name: full, submissions: 1, firstSeen });
      return;
    }
    existing.submissions += 1;
    existing.firstSeen = earliestDate(existing.firstSeen, firstSeen);
  });

  const doctorBuckets: Record<string, number> = {};
  doctorMap.forEach((doc) => {
    doctorBuckets[doc.specialty] = (doctorBuckets[doc.specialty] || 0) + 1;
  });

  const treatmentBuckets: Record<string, number> = {};
  treatmentMap.forEach((t) => {
    const key = profitabilityLabels[t.profitability] || t.profitabilityLabel;
    treatmentBuckets[key] = (treatmentBuckets[key] || 0) + 1;
  });

  const paymentsByScore = Array.from(paymentMap.values()).sort(
    (a, b) => b.bestScore - a.bestScore
  );

  const report: ReportData = {
    doctors: Array.from(doctorMap.values()),
    treatments: Array.from(treatmentMap.values()),
    payments: Array.from(paymentMap.values()),
    people: Array.from(peopleMap.values()),
    kpis: {
      totalPeople: peopleMap.size,
      totalPaymentTypes: paymentMap.size,
      totalTreatments: treatmentMap.size,
      totalDoctors: doctorMap.size
    },
    charts: {
      paymentsByScore,
      treatmentProfitBuckets: Object.entries(treatmentBuckets).map(([name, value]) => ({
        name,
        value
      })),
      doctorsBySpecialty: Object.entries(doctorBuckets).map(([name, value]) => ({
        name,
        value
      }))
    }
  };

  return report;
}

export function loadFromLocalStorage(): RawAdminData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem("atiyeh_admin_data");
    if (stored) {
      return JSON.parse(stored) as RawAdminData;
    }
  } catch (err) {
    console.warn("Failed to parse atiyeh_admin_data", err);
  }

  try {
    const persons = window.localStorage.getItem("persons");
    const payments = window.localStorage.getItem("paymentTypes");
    const treatments = window.localStorage.getItem("treatments");
    const doctors = window.localStorage.getItem("doctors");
    if (persons || payments || treatments || doctors) {
      return {
        persons: persons ? JSON.parse(persons) : [],
        paymentTypes: payments ? JSON.parse(payments) : [],
        treatments: treatments ? JSON.parse(treatments) : [],
        doctors: doctors ? JSON.parse(doctors) : []
      };
    }
  } catch (err) {
    console.warn("Failed to parse legacy localStorage data", err);
  }
  return null;
}

export async function fetchAdminData(): Promise<{
  data: RawAdminData | null;
  source: DataSource;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { data: null, source: "none" };
  }

  const tryFetch = async (url: string, source: DataSource) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as RawAdminData;
      return { data: json, source };
    } catch {
      return null;
    }
  };

  const fromExport = await tryFetch("/api/admin/export", "api-export");
  if (fromExport) return fromExport;

  const fromData = await tryFetch("/api/admin/data", "api-data");
  if (fromData) return fromData;

  const local = loadFromLocalStorage();
  if (local) {
    return { data: local, source: "local-storage" };
  }

  return { data: null, source: "none", error: "No data found" };
}

export function persistAdminData(data: RawAdminData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("atiyeh_admin_data", JSON.stringify(data));
  } catch (err) {
    console.error("Failed to persist admin data", err);
  }
}

