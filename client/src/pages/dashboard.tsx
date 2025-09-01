import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import KPICard from "@/components/dashboard/kpi-card";
import SalesChart from "@/components/dashboard/sales-chart";
import PlatformChart from "@/components/dashboard/platform-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, DollarSign, Clock, TrendingDown } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{
    orders: {
      totalOrders: number;
      totalRevenue: string;
      pendingOrders: number;
      returnRate: string;
    };
    expenses: {
      monthlyExpenses: string;
      pendingApprovals: number;
      budgetRemaining: string;
    };
    salesData: { month: string; sales: number }[];
    platformData: { platform: string; percentage: number }[];
  }>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/orders"],
    retry: false,
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Header title="Dashboard" subtitle="Overview of your order management system" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.orders || {};
  const expenses = dashboardData?.expenses || {};

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Dashboard" subtitle="Overview of your order management system" />
      <div className="flex-1 overflow-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Orders"
            value={stats.totalOrders || 0}
            icon={ShoppingCart}
            iconColor="bg-primary/10 text-primary"
            trend={{ value: "12.5%", positive: true, label: "vs last month" }}
          />
          <KPICard
            title="Total Revenue"
            value={`₹${parseFloat(stats.totalRevenue || "0").toLocaleString()}`}
            icon={DollarSign}
            iconColor="bg-green-500/10 text-green-500"
            trend={{ value: "8.2%", positive: true, label: "vs last month" }}
          />
          <KPICard
            title="Pending Orders"
            value={stats.pendingOrders || 0}
            icon={Clock}
            iconColor="bg-yellow-500/10 text-yellow-500"
            trend={{ value: "3.1%", positive: false, label: "vs last week" }}
          />
          <KPICard
            title="Return Rate"
            value={`${stats.returnRate || "0"}%`}
            icon={TrendingDown}
            iconColor="bg-red-500/10 text-red-500"
            trend={{ value: "0.5%", positive: true, label: "vs last month" }}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SalesChart data={dashboardData?.salesData || []} />
          <PlatformChart data={dashboardData?.platformData || []} />
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/orders">
                <Button variant="ghost" size="sm" data-testid="button-view-all-orders">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders?.orders?.slice(0, 5).map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary" data-testid={`order-id-${order.id}`}>
                        #{order.platformOrderId}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground" data-testid={`customer-${order.id}`}>
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {order.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground" data-testid={`amount-${order.id}`}>
                        ₹{parseFloat(order.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`} data-testid={`status-${order.id}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
