import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Download, FileText } from "lucide-react";

interface OrderFiltersProps {
  filters: {
    platform: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  totalOrders: number;
  currentPage: number;
  pageSize: number;
}

export default function OrderFilters({ 
  filters, 
  onFilterChange, 
  onExport, 
  totalOrders, 
  currentPage, 
  pageSize 
}: OrderFiltersProps) {
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalOrders);

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
          <Select value={filters.platform} onValueChange={(value) => onFilterChange('platform', value)}>
            <SelectTrigger data-testid="filter-platform">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
              <SelectItem value="flipkart">Flipkart</SelectItem>
              <SelectItem value="meesho">Meesho</SelectItem>
              <SelectItem value="website">My Website</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Status</label>
          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger data-testid="filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date From</label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            data-testid="filter-date-from"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Search</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search orders..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="pr-10"
              data-testid="input-search"
            />
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground" data-testid="text-showing-entries">
          Showing {startIndex}-{endIndex} of {totalOrders} orders
        </p>
        <div className="flex space-x-2">
          <Button 
            onClick={() => onExport('csv')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => onExport('pdf')}
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
