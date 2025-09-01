import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import type { Order } from "@shared/schema";

interface OrdersTableProps {
  orders: Order[];
  onSort: (column: string) => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export default function OrdersTable({ orders, onSort, sortColumn, sortDirection }: OrdersTableProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'amazon':
        return 'bg-orange-100 text-orange-800';
      case 'flipkart':
        return 'bg-blue-100 text-blue-800';
      case 'meesho':
        return 'bg-purple-100 text-purple-800';
      case 'website':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:text-foreground transition-colors"
      onClick={() => onSort(column)}
      data-testid={`sort-${column}`}
    >
      <div className="flex items-center">
        {children}
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </div>
    </TableHead>
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <SortableHeader column="platformOrderId">Order ID</SortableHeader>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Platform</TableHead>
              <SortableHeader column="totalAmount">Amount</SortableHeader>
              <TableHead>Status</TableHead>
              <SortableHeader column="createdAt">Date</SortableHeader>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                    data-testid={`checkbox-order-${order.id}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="link" className="p-0 h-auto text-primary hover:text-primary/80" data-testid={`link-order-${order.id}`}>
                      #{order.platformOrderId}
                    </Button>
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-foreground" data-testid={`customer-name-${order.id}`}>
                      {order.customerName}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`customer-phone-${order.id}`}>
                      {order.customerPhone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-foreground" data-testid={`product-name-${order.id}`}>
                      {order.productName}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`product-quantity-${order.id}`}>
                      Qty: {order.quantity}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(order.platform)}`} data-testid={`platform-${order.id}`}>
                    {order.platform.charAt(0).toUpperCase() + order.platform.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="font-medium" data-testid={`amount-${order.id}`}>
                  ₹{parseFloat(order.totalAmount).toLocaleString()}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`} data-testid={`status-${order.id}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div data-testid={`date-${order.id}`}>
                      {new Date(order.createdAt!).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`time-${order.id}`}>
                      {new Date(order.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`button-view-${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-${order.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" data-testid={`button-delete-${order.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {orders.length === 0 && (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-no-orders">
          No orders found matching your criteria
        </div>
      )}
    </div>
  );
}
