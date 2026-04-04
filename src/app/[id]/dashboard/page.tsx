"use client";

import StatsCards from "@/components/dashboard/StatsCards";
import WeeklyReport from "@/components/dashboard/WeeklyReport";
import UsersActivity from "@/components/dashboard/UsersActivity";
import TransactionTable from "@/components/dashboard/TransactionTable";
import TopProducts from "@/components/dashboard/TopProducts";
import BestSellingProducts from "@/components/dashboard/BestSellingProducts";
import AddNewProduct from "@/components/dashboard/AddNewProduct";
import SalesByMonth from "@/components/dashboard/SalesByMonth";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <WeeklyReport />
        <div className="flex flex-col gap-6">
          <UsersActivity />
          <SalesByMonth />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <TransactionTable />
        <TopProducts />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <BestSellingProducts />
        <AddNewProduct />
      </div>
    </div>
  );
}
