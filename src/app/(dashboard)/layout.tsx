import DashboardRootLayout from "@/components/dashboard/DashboardRootLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardRootLayout>{children}</DashboardRootLayout>;
}
