import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Truck, Package, Settings, Plus, MapPin, CreditCard } from "lucide-react";
import { Link, useRoute } from "wouter";
import type { OrderWithHistory } from "@shared/schema";

export default function OrderDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/orders/:id");
  const orderId = params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!orderId,
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      return await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Header title="Order Details" subtitle="View and manage order information" />
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-64 bg-muted rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 overflow-hidden">
        <Header title="Order Details" subtitle="View and manage order information" />
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Order Not Found</h3>
              <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
              <Link href="/orders">
                <Button>Back to Orders</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Check className="w-4 h-4 text-white" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-white" />;
      case 'processing':
        return <Settings className="w-4 h-4 text-white" />;
      case 'pending':
        return <Package className="w-4 h-4 text-white" />;
      default:
        return <Plus className="w-4 h-4 text-white" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'shipped':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-purple-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'returned':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const canUpdateStatus = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="flex-1 overflow-hidden">
      <Header 
        title={`Order Details - #${order.platformOrderId}`} 
        subtitle="View and manage order information" 
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Link href="/orders">
            <Button variant="outline" size="sm" data-testid="button-back-to-orders">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 h-full w-0.5 bg-border"></div>
                <div className="space-y-6">
                  {order.statusHistory?.map((history: any, index: number) => (
                    <div key={history.id} className="relative flex items-center">
                      <div className={`w-8 h-8 ${getStatusColor(history.status)} rounded-full flex items-center justify-center z-10`}>
                        {getStatusIcon(history.status)}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-foreground capitalize" data-testid={`timeline-status-${index}`}>
                          {history.status.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`timeline-date-${index}`}>
                          {new Date(history.createdAt).toLocaleString()}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`timeline-notes-${index}`}>
                            {history.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {canUpdateStatus && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Update Status</h4>
                  <div className="flex space-x-2">
                    <Select onValueChange={(status) => updateStatusMutation.mutate({ status })}>
                      <SelectTrigger className="flex-1" data-testid="select-new-status">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Information */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-customer-name">
                    {order.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-customer-phone">
                    {order.customerPhone}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-customer-email">
                    {order.customerEmail || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Address:</span>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-customer-address">
                    {order.customerAddress || order.shippingAddress || 'Not provided'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Method:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-payment-method">
                    {order.paymentMethod || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Transaction ID:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-transaction-id">
                    {order.transactionId || 'Not available'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="ml-2 text-lg font-semibold text-foreground" data-testid="text-total-amount">
                    ₹{parseFloat(order.totalAmount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge 
                    className={`ml-2 ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    data-testid="badge-payment-status"
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Product:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-product-name">
                    {order.productName}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">SKU:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-product-sku">
                    {order.productSku || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Quantity:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-product-quantity">
                    {order.quantity}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Unit Price:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="text-unit-price">
                    ₹{parseFloat(order.unitPrice).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Platform:</span>
                  <Badge className="ml-2" data-testid="badge-platform">
                    {order.platform.charAt(0).toUpperCase() + order.platform.slice(1)}
                  </Badge>
                </div>
                {order.trackingNumber && (
                  <div>
                    <span className="text-sm font-medium">Tracking Number:</span>
                    <span className="ml-2 text-sm text-muted-foreground" data-testid="text-tracking-number">
                      {order.trackingNumber}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
