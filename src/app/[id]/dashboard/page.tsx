"use client";

import StatsCards from "@/components/dashboard/StatsCards";
import FoodStatsCards from "@/components/dashboard/FoodStatsCards";
import WeeklyReport from "@/components/dashboard/WeeklyReport";
import UsersActivity from "@/components/dashboard/UsersActivity";
import TransactionTable from "@/components/dashboard/TransactionTable";
import TopProducts from "@/components/dashboard/TopProducts";
import BestSellingProducts from "@/components/dashboard/BestSellingProducts";
import AddNewProduct from "@/components/dashboard/AddNewProduct";
import SalesByMonth from "@/components/dashboard/SalesByMonth";
import PopularByTimeOfDay from "@/components/dashboard/PopularByTimeOfDay";
import { useIsFood } from "@/hooks/useBusinessType";

export default function DashboardPage() {
  const isFood = useIsFood();

  return (
    <div className="space-y-6">
      {isFood ? <FoodStatsCards /> : <StatsCards />}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <WeeklyReport />
        <div className="flex flex-col gap-6">
          <UsersActivity />
          <SalesByMonth />
        </div>
      </div>
      {isFood && <PopularByTimeOfDay />}
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
