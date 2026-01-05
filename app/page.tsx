import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-teal-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 text-center">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            گزارشات ادمین
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            داشبورد گزارشات فرم آتیه
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            داده‌ها را از API یا localStorage جمع‌آوری کنید و در یک داشبورد حرفه‌ای
            ببینید.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="no-print inline-flex items-center rounded-full bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-300/50 transition hover:translate-y-[-1px] hover:bg-primary-700"
        >
          مشاهده گزارشات ادمین
        </Link>
      </div>
    </main>
  );
}

