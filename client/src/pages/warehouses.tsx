import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Warehouse, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  FileText,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  BarChart3,
  Settings,
  Users,
  Edit,
  Trash2
} from "lucide-react";
import { z } from "zod";
import type { 
  Warehouse as WarehouseType, 
  WarehouseWithDetails,
  Product,
  InventoryWithDetails,
  StockMovementWithDetails,
  WarehouseTransferWithDetails
} from "@shared/schema";

// Form schemas
const warehouseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
});

const inventoryAdjustmentSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number(),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

const warehouseTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
type InventoryAdjustmentData = z.infer<typeof inventoryAdjustmentSchema>;
type WarehouseTransferData = z.infer<typeof warehouseTransferSchema>;

export default function WarehousesPage() {
  const { toast } = useToast();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<WarehouseWithDetails[]>({
    queryKey: ["/api/warehouses"],
  });

  // Fetch products for forms
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch inventory for selected warehouse
  const { data: inventory = [] } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory", selectedWarehouse],
    enabled: !!selectedWarehouse,
  });

  // Fetch stock movements for selected warehouse
  const { data: stockMovements = [] } = useQuery<StockMovementWithDetails[]>({
    queryKey: ["/api/stock-movements", selectedWarehouse],
    enabled: !!selectedWarehouse,
  });

  // Fetch warehouse transfers
  const { data: warehouseTransfers = [] } = useQuery<WarehouseTransferWithDetails[]>({
    queryKey: ["/api/warehouse-transfers", selectedWarehouse],
    enabled: !!selectedWarehouse,
  });

  // Fetch warehouse report
  const { data: warehouseReport } = useQuery({
    queryKey: ["/api/warehouses", selectedWarehouse, "report"],
    enabled: !!selectedWarehouse,
  });

  // Mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormData) => apiRequest("/api/warehouses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "Warehouse created successfully" });
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WarehouseFormData }) => 
      apiRequest(`/api/warehouses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      setEditingWarehouse(null);
      toast({ title: "Success", description: "Warehouse updated successfully" });
    },
  });

  const adjustInventoryMutation = useMutation({
    mutationFn: (data: InventoryAdjustmentData) => apiRequest("/api/inventory/adjust", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setIsAdjustDialogOpen(false);
      toast({ title: "Success", description: "Inventory adjusted successfully" });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: (data: WarehouseTransferData) => apiRequest("/api/warehouse-transfers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers"] });
      setIsTransferDialogOpen(false);
      toast({ title: "Success", description: "Transfer request created successfully" });
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: (transferId: string) => apiRequest(`/api/warehouse-transfers/${transferId}/approve`, {
      method: "PATCH",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers"] });
      toast({ title: "Success", description: "Transfer approved successfully" });
    },
  });

  const processTransferMutation = useMutation({
    mutationFn: (transferId: string) => apiRequest(`/api/warehouse-transfers/${transferId}/process`, {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      toast({ title: "Success", description: "Transfer completed successfully" });
    },
  });

  // Form hooks
  const warehouseForm = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
    },
  });

  const adjustmentForm = useForm<InventoryAdjustmentData>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      warehouseId: selectedWarehouse || "",
      productId: "",
      quantity: 0,
      reason: "",
      notes: "",
    },
  });

  const transferForm = useForm<WarehouseTransferData>({
    resolver: zodResolver(warehouseTransferSchema),
    defaultValues: {
      fromWarehouseId: "",
      toWarehouseId: "",
      productId: "",
      quantity: 1,
      notes: "",
    },
  });

  const onCreateWarehouse = (data: WarehouseFormData) => {
    createWarehouseMutation.mutate(data);
  };

  const onUpdateWarehouse = (data: WarehouseFormData) => {
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data });
    }
  };

  const onAdjustInventory = (data: InventoryAdjustmentData) => {
    adjustInventoryMutation.mutate(data);
  };

  const onCreateTransfer = (data: WarehouseTransferData) => {
    createTransferMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" data-testid={`status-pending`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "in_transit":
        return <Badge variant="outline" data-testid={`status-in-transit`}><Truck className="w-3 h-3 mr-1" />In Transit</Badge>;
      case "completed":
        return <Badge variant="default" data-testid={`status-completed`}><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid={`status-cancelled`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case "inbound":
      case "transfer_in":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "outbound":
      case "transfer_out":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "adjustment":
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Warehouse Management</h1>
          <p className="text-muted-foreground">Manage warehouses, inventory, and transfers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-warehouse">
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Warehouse</DialogTitle>
              <DialogDescription>
                Add a new warehouse to your management system
              </DialogDescription>
            </DialogHeader>
            <Form {...warehouseForm}>
              <form onSubmit={warehouseForm.handleSubmit(onCreateWarehouse)} className="space-y-4">
                <FormField
                  control={warehouseForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter warehouse name" {...field} data-testid="input-warehouse-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter warehouse location" {...field} data-testid="input-warehouse-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter warehouse description" {...field} data-testid="input-warehouse-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createWarehouseMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    Create Warehouse
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <Card 
            key={warehouse.id} 
            className={`cursor-pointer transition-all ${selectedWarehouse === warehouse.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
            onClick={() => setSelectedWarehouse(warehouse.id)}
            data-testid={`card-warehouse-${warehouse.id}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{warehouse.name}</CardTitle>
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingWarehouse(warehouse);
                    warehouseForm.reset({
                      name: warehouse.name,
                      description: warehouse.description || "",
                      location: warehouse.location || "",
                    });
                  }}
                  data-testid={`button-edit-${warehouse.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Warehouse className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{warehouse.location}</p>
                <div className="flex justify-between text-sm">
                  <span>Products:</span>
                  <span className="font-medium">{warehouse.inventory?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <Badge variant={warehouse.isActive ? "default" : "secondary"} data-testid={`status-${warehouse.id}`}>
                    {warehouse.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      {selectedWarehouse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-6 w-6" />
              {warehouses.find(w => w.id === selectedWarehouse)?.name} - Detailed View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
                <TabsTrigger value="movements" data-testid="tab-movements">Stock Movements</TabsTrigger>
                <TabsTrigger value="transfers" data-testid="tab-transfers">Transfers</TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-total-products">
                        {warehouseReport?.inventoryStats?.totalProducts || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-inventory-value">
                        ${warehouseReport?.inventoryStats?.totalValue || "0"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600" data-testid="metric-low-stock">
                        {warehouseReport?.inventoryStats?.lowStockItems || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600" data-testid="metric-out-stock">
                        {warehouseReport?.inventoryStats?.outOfStockItems || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Stock Movements</h3>
                  <div className="space-y-2">
                    {warehouseReport?.recentMovements?.slice(0, 5).map((movement, index) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getMovementTypeIcon(movement.movementType)}
                          <div>
                            <p className="font-medium">{movement.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {movement.reason} • {movement.movementType.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {movement.movementType.includes('outbound') ? '-' : '+'}
                            {movement.quantity}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground">No recent movements</p>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Inventory Management</h3>
                  <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-adjust-inventory">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Adjust Inventory
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adjust Inventory</DialogTitle>
                        <DialogDescription>
                          Make quantity adjustments to warehouse inventory
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...adjustmentForm}>
                        <form onSubmit={adjustmentForm.handleSubmit(onAdjustInventory)} className="space-y-4">
                          <FormField
                            control={adjustmentForm.control}
                            name="productId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-adjust-product">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} - {product.sku}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={adjustmentForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity Change</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Enter quantity change" {...field} data-testid="input-adjust-quantity" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={adjustmentForm.control}
                            name="reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reason</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-adjust-reason">
                                      <SelectValue placeholder="Select reason" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="purchase">Purchase</SelectItem>
                                    <SelectItem value="return">Return</SelectItem>
                                    <SelectItem value="damage">Damage</SelectItem>
                                    <SelectItem value="count_adjustment">Count Adjustment</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={adjustmentForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter notes" {...field} data-testid="input-adjust-notes" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsAdjustDialogOpen(false)}
                              data-testid="button-cancel-adjust"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={adjustInventoryMutation.isPending}
                              data-testid="button-submit-adjust"
                            >
                              Adjust Inventory
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Min Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell>{item.product.sku}</TableCell>
                          <TableCell data-testid={`stock-${item.id}`}>{item.quantity}</TableCell>
                          <TableCell>{item.reservedQuantity}</TableCell>
                          <TableCell>{item.quantity - item.reservedQuantity}</TableCell>
                          <TableCell>{item.minStockLevel || '-'}</TableCell>
                          <TableCell>
                            {item.quantity === 0 ? (
                              <Badge variant="destructive" data-testid={`inventory-status-${item.id}`}>Out of Stock</Badge>
                            ) : item.quantity <= (item.minStockLevel || 10) ? (
                              <Badge variant="secondary" data-testid={`inventory-status-${item.id}`}>Low Stock</Badge>
                            ) : (
                              <Badge variant="default" data-testid={`inventory-status-${item.id}`}>In Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="movements" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Stock Movement History</h3>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.slice(0, 20).map((movement) => (
                        <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                          <TableCell>
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{movement.product.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMovementTypeIcon(movement.movementType)}
                              <span className="capitalize">{movement.movementType.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className={movement.movementType.includes('outbound') ? 'text-red-600' : 'text-green-600'}>
                            {movement.movementType.includes('outbound') ? '-' : '+'}{movement.quantity}
                          </TableCell>
                          <TableCell data-testid={`movement-previous-${movement.id}`}>{movement.previousQuantity}</TableCell>
                          <TableCell data-testid={`movement-new-${movement.id}`}>{movement.newQuantity}</TableCell>
                          <TableCell>{movement.reason}</TableCell>
                          <TableCell>{movement.createdByUser?.firstName || 'System'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Warehouse Transfers</h3>
                  <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-transfer">
                        <Truck className="w-4 h-4 mr-2" />
                        Create Transfer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Warehouse Transfer</DialogTitle>
                        <DialogDescription>
                          Transfer inventory between warehouses
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...transferForm}>
                        <form onSubmit={transferForm.handleSubmit(onCreateTransfer)} className="space-y-4">
                          <FormField
                            control={transferForm.control}
                            name="fromWarehouseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>From Warehouse</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-from-warehouse">
                                      <SelectValue placeholder="Select source warehouse" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {warehouses.map((warehouse) => (
                                      <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name} - {warehouse.location}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={transferForm.control}
                            name="toWarehouseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>To Warehouse</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-to-warehouse">
                                      <SelectValue placeholder="Select destination warehouse" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {warehouses.map((warehouse) => (
                                      <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name} - {warehouse.location}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={transferForm.control}
                            name="productId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-transfer-product">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} - {product.sku}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={transferForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Enter quantity" {...field} data-testid="input-transfer-quantity" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={transferForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter notes" {...field} data-testid="input-transfer-notes" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsTransferDialogOpen(false)}
                              data-testid="button-cancel-transfer"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createTransferMutation.isPending}
                              data-testid="button-submit-transfer"
                            >
                              Create Transfer
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouseTransfers.map((transfer) => (
                        <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                          <TableCell>
                            {new Date(transfer.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{transfer.product.name}</TableCell>
                          <TableCell>{transfer.fromWarehouse.name}</TableCell>
                          <TableCell>{transfer.toWarehouse.name}</TableCell>
                          <TableCell data-testid={`transfer-quantity-${transfer.id}`}>{transfer.quantity}</TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell>{transfer.requestedByUser.firstName}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {transfer.status === 'pending' && !transfer.approvedBy && (
                                <Button
                                  size="sm"
                                  onClick={() => approveTransferMutation.mutate(transfer.id)}
                                  disabled={approveTransferMutation.isPending}
                                  data-testid={`button-approve-${transfer.id}`}
                                >
                                  Approve
                                </Button>
                              )}
                              {transfer.status === 'pending' && transfer.approvedBy && (
                                <Button
                                  size="sm"
                                  onClick={() => processTransferMutation.mutate(transfer.id)}
                                  disabled={processTransferMutation.isPending}
                                  data-testid={`button-process-${transfer.id}`}
                                >
                                  Process
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Warehouse Reports</h3>
                </div>
                
                {warehouseReport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Movement Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Inbound:</span>
                          <span className="font-medium text-green-600" data-testid="stat-inbound">
                            {warehouseReport.movementStats.totalInbound}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Outbound:</span>
                          <span className="font-medium text-red-600" data-testid="stat-outbound">
                            {warehouseReport.movementStats.totalOutbound}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transfers In:</span>
                          <span className="font-medium" data-testid="stat-transfers-in">
                            {warehouseReport.movementStats.totalTransfersIn}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transfers Out:</span>
                          <span className="font-medium" data-testid="stat-transfers-out">
                            {warehouseReport.movementStats.totalTransfersOut}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Pending Transfers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {warehouseReport.pendingTransfers.length > 0 ? (
                          <div className="space-y-2">
                            {warehouseReport.pendingTransfers.map((transfer) => (
                              <div key={transfer.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div>
                                  <p className="font-medium">{transfer.product.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {transfer.fromWarehouse.name} → {transfer.toWarehouse.name}
                                  </p>
                                </div>
                                <Badge variant="secondary">Qty: {transfer.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground" data-testid="no-pending-transfers">No pending transfers</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Edit Warehouse Dialog */}
      <Dialog open={editingWarehouse !== null} onOpenChange={(open) => !open && setEditingWarehouse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>
              Update warehouse information
            </DialogDescription>
          </DialogHeader>
          <Form {...warehouseForm}>
            <form onSubmit={warehouseForm.handleSubmit(onUpdateWarehouse)} className="space-y-4">
              <FormField
                control={warehouseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter warehouse name" {...field} data-testid="input-edit-warehouse-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter warehouse location" {...field} data-testid="input-edit-warehouse-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter warehouse description" {...field} data-testid="input-edit-warehouse-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingWarehouse(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateWarehouseMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  Update Warehouse
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}