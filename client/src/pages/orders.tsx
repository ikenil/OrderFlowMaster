import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import OrderFilters from "@/components/orders/order-filters";
import OrdersTable from "@/components/orders/orders-table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Orders() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  const [filters, setFilters] = useState({
    platform: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

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

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", filters, currentPage, sortColumn, sortDirection],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params.get(key)) {
          params.delete(key);
        }
      });

      const response = await fetch(`/api/orders?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    retry: false,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Exporting orders to ${format.toUpperCase()}...`,
    });
    // TODO: Implement actual export functionality
  };

  if (isLoading || ordersLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Header title="Orders Management" subtitle="Manage and track all your orders across platforms" />
        <div className="p-6">
          <div className="bg-card rounded-lg border border-border p-6 mb-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Orders Management" subtitle="Manage and track all your orders across platforms" />
      <div className="flex-1 overflow-auto p-6">
        <OrderFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          totalOrders={totalOrders}
          currentPage={currentPage}
          pageSize={pageSize}
        />

        <OrdersTable
          orders={orders}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
