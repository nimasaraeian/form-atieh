"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import clsx from "clsx";
import {
  DataSource,
  RawAdminData,
  ReportData,
  fetchAdminData,
  persistAdminData,
  prepareReport
} from "@/lib/admin/reporting";

const chartPalette = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#a855f7", "#22c55e"];

function formatDate(value?: string) {
  if (!value) return "نامشخص";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fa-IR");
}

function EmptyState({
  onImport,
  manualJson,
  setManualJson
}: {
  onImport: () => void;
  manualJson: string;
  setManualJson: (v: string) => void;
}) {
  return (
    <div className="card p-8">
      <div className="space-y-4 text-right">
        <h3 className="text-xl font-bold text-slate-900">هنوز داده‌ای پیدا نشد</h3>
        <p className="text-slate-600">
          ابتدا تلاش شد از API ادمین داده دریافت شود. اگر دسترسی ندارید، JSON خروجی
          را اینجا وارد کنید تا در مرورگر ذخیره شود.
        </p>
        <textarea
          value={manualJson}
          onChange={(e) => setManualJson(e.target.value)}
          placeholder="JSON خروجی /api/admin/export یا localStorage را اینجا وارد کنید"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          rows={6}
        />
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-300/40 transition hover:bg-primary-700"
          >
            ذخیره و بارگذاری
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
      {label}
    </span>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
      {message}
    </div>
  );
}

function Table<T>({
  title,
  subtitle,
  columns,
  rows
}: {
  title: string;
  subtitle?: string;
  columns: { key: keyof T; label: string; className?: string }[];
  rows: T[];
}) {
  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <p className="muted mt-1">{subtitle}</p>}
        </div>
        <InfoPill label={`${rows.length} مورد`} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-right">
          <thead className="text-sm text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className={clsx("px-3 py-2 font-semibold", col.className)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-3 text-center text-slate-400">
                  داده‌ای وجود ندارد
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="rounded-xl bg-slate-50/60 hover:bg-slate-100/70">
                  {columns.map((col) => (
                    <td key={String(col.key)} className={clsx("px-3 py-2 align-top", col.className)}>
                      {(row as any)[col.key] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const [rawData, setRawData] = useState<RawAdminData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualJson, setManualJson] = useState("");
  const [source, setSource] = useState<DataSource>("none");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminData();
    if (res.data) {
      setRawData(res.data);
      setReport(prepareReport(res.data));
      setSource(res.source);
    } else {
      setError(res.error || "داده‌ای پیدا نشد");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleManualImport = () => {
    if (!manualJson.trim()) {
      setError("متن JSON خالی است");
      return;
    }
    try {
      const parsed = JSON.parse(manualJson) as RawAdminData;
      persistAdminData(parsed);
      setRawData(parsed);
      setReport(prepareReport(parsed));
      setSource("manual-import");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("فرمت JSON نامعتبر است");
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            source,
            report,
            raw: rawData
          },
          null,
          2
        )
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = useMemo(
    () => [
      { label: "افراد یکتا", value: report?.kpis.totalPeople ?? 0 },
      { label: "انواع پرداخت یکتا", value: report?.kpis.totalPaymentTypes ?? 0 },
      { label: "درمان‌های یکتا", value: report?.kpis.totalTreatments ?? 0 },
      { label: "پزشکان یکتا", value: report?.kpis.totalDoctors ?? 0 }
    ],
    [report?.kpis]
  );

  const hasData =
    (report?.kpis.totalPeople ?? 0) +
      (report?.kpis.totalPaymentTypes ?? 0) +
      (report?.kpis.totalTreatments ?? 0) +
      (report?.kpis.totalDoctors ?? 0) >
    0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-teal-50 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
              Admin Reports
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">داشبورد گزارشات</h1>
            <p className="muted mt-1">
              داده‌ها از API ادمین یا localStorage جمع‌آوری می‌شوند و پس از پاکسازی نمایش داده
              می‌شوند.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-3">
            {source !== "none" && <InfoPill label={`منبع: ${source}`} />}
            <button
              onClick={loadData}
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              رفرش
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              چاپ
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-300/40 transition hover:bg-primary-700"
            >
              دانلود JSON
            </button>
          </div>
        </header>

        {loading && (
          <div className="card p-6">
            <p className="text-sm text-slate-500">در حال بارگذاری داده‌ها...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-lg">⚠️</span>
              <div>
                <p className="font-semibold">خطا در دریافت داده</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !hasData && <EmptyState onImport={handleManualImport} manualJson={manualJson} setManualJson={setManualJson} />}

        {report && hasData && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="card p-5">
                  <p className="muted">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card col-span-1 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="card-title">انواع پرداخت بر اساس امتیاز</div>
                    <p className="muted mt-1">مرتب‌شده بر اساس بهترین امتیاز</p>
                  </div>
                </div>
                <div className="mt-4 h-72">
                  {report.charts.paymentsByScore.length === 0 ? (
                    <ChartEmpty message="داده‌ای برای پرداخت وجود ندارد" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.charts.paymentsByScore} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 10]} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip formatter={(value: number) => [`امتیاز ${value}`, "بهترین امتیاز"]} />
                        <Bar dataKey="bestScore" radius={[8, 8, 8, 8]} fill={chartPalette[0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card col-span-1 p-6">
                <div className="card-title">سودآوری درمان‌ها</div>
                <p className="muted mt-1">توزیع باکت سودآوری</p>
                <div className="mt-4 h-72">
                  {report.charts.treatmentProfitBuckets.length === 0 ? (
                    <ChartEmpty message="داده‌ای برای درمان‌ها وجود ندارد" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.charts.treatmentProfitBuckets}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {report.charts.treatmentProfitBuckets.map((_, idx) => (
                            <Cell key={idx} fill={chartPalette[idx % chartPalette.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card col-span-1 p-6">
                <div className="card-title">پزشکان بر اساس تخصص</div>
                <p className="muted mt-1">گروه‌بندی تخصص</p>
                <div className="mt-4 h-72">
                  {report.charts.doctorsBySpecialty.length === 0 ? (
                    <ChartEmpty message="داده‌ای برای پزشکان وجود ندارد" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.charts.doctorsBySpecialty}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={chartPalette[2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <Table
              title="پزشکان یکتا"
              subtitle="نام و تخصص محاسبه‌شده"
              columns={[
                { key: "name", label: "نام پزشک" },
                { key: "specialty", label: "تخصص" },
                { key: "notes", label: "یادداشت" }
              ]}
              rows={report.doctors}
            />

            <Table
              title="درمان‌های یکتا"
              subtitle="بر اساس نام درمان، سودآوری و هزینه"
              columns={[
                { key: "name", label: "نام درمان" },
                { key: "profitabilityLabel", label: "سطح سودآوری" },
                { key: "cost", label: "هزینه/قیمت (گزارش‌شده)" },
                { key: "notes", label: "یادداشت" }
              ]}
              rows={report.treatments}
            />

            <Table
              title="پرداخت‌های یکتا"
              subtitle="انواع پرداخت پس از تفکیک ترکیبی"
              columns={[
                { key: "name", label: "نوع پرداخت" },
                { key: "bestScore", label: "بهترین امتیاز" },
                { key: "stars", label: "ستاره" },
                { key: "delay", label: "تاخیر معمول" },
                { key: "notes", label: "یادداشت" }
              ]}
              rows={report.payments}
            />

            <Table
              title="افراد یکتا"
              subtitle="بر اساس نام نرمال‌سازی شده"
              columns={[
                { key: "name", label: "نام کامل" },
                {
                  key: "firstSeen",
                  label: "اولین ثبت",
                  className: "whitespace-nowrap"
                },
                { key: "submissions", label: "تعداد ثبت‌ها" }
              ]}
              rows={report.people.map((p) => ({ ...p, firstSeen: formatDate(p.firstSeen) }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

