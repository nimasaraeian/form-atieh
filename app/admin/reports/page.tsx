import dynamic from "next/dynamic";

const ReportsDashboard = dynamic(() => import("@/components/admin/ReportsDashboard"), {
  ssr: false
});

export default function AdminReportsPage() {
  return <ReportsDashboard />;
}

