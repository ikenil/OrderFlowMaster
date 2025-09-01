import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, Users, BarChart3, AlertTriangle, MapPin } from "lucide-react";

// Schema definitions for forms
const warehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'beauty', 'sports', 'toys', 'other']).default('other'),
  unitPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  supplier: z.string().optional(),
});

const inventorySchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  minStockLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().min(0).optional(),
});

type Warehouse = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  unitPrice: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type Inventory = {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  updatedAt: string;
  warehouse: Warehouse;
  product: Product;
};

export default function Warehouses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("warehouses");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  // Queries
  const { data: warehouses, isLoading: warehousesLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
    retry: false,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory", selectedWarehouse],
    retry: false,
  });

  // Warehouse management
  const WarehouseForm = ({ warehouse, onClose }: { warehouse?: Warehouse; onClose: () => void }) => {
    const form = useForm({
      resolver: zodResolver(warehouseSchema),
      defaultValues: {
        name: warehouse?.name || "",
        description: warehouse?.description || "",
        location: warehouse?.location || "",
      },
    });

    const createWarehouseMutation = useMutation({
      mutationFn: async (data: z.infer<typeof warehouseSchema>) => {
        const endpoint = warehouse ? `/api/warehouses/${warehouse.id}` : "/api/warehouses";
        const method = warehouse ? "PATCH" : "POST";
        return apiRequest(method, endpoint, data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
        toast({
          title: "Success",
          description: `Warehouse ${warehouse ? 'updated' : 'created'} successfully`,
        });
        onClose();
      },
      onError: (error) => {
        if (isUnauthorizedError(error as Error)) {
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
          description: "Failed to save warehouse",
          variant: "destructive",
        });
      },
    });

    const onSubmit = (data: z.infer<typeof warehouseSchema>) => {
      createWarehouseMutation.mutate(data);
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
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
            control={form.control}
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
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter warehouse description" {...field} data-testid="input-warehouse-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={createWarehouseMutation.isPending} data-testid="button-save-warehouse">
              {createWarehouseMutation.isPending ? "Saving..." : warehouse ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Product management
  const ProductForm = ({ product, onClose }: { product?: Product; onClose: () => void }) => {
    const form = useForm({
      resolver: zodResolver(productSchema),
      defaultValues: {
        name: product?.name || "",
        sku: product?.sku || "",
        description: product?.description || "",
        category: (product?.category || "other") as any,
        unitPrice: product?.unitPrice ? parseFloat(product.unitPrice) : undefined,
      },
    });

    const createProductMutation = useMutation({
      mutationFn: async (data: z.infer<typeof productSchema>) => {
        const endpoint = product ? `/api/products/${product.id}` : "/api/products";
        const method = product ? "PATCH" : "POST";
        return apiRequest(method, endpoint, data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({
          title: "Success",
          description: `Product ${product ? 'updated' : 'created'} successfully`,
        });
        onClose();
      },
      onError: (error) => {
        if (isUnauthorizedError(error as Error)) {
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
          description: "Failed to save product",
          variant: "destructive",
        });
      },
    });

    const onSubmit = (data: z.infer<typeof productSchema>) => {
      createProductMutation.mutate(data);
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product name" {...field} data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter SKU" {...field} data-testid="input-product-sku" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="toys">Toys</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="input-product-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter product description" {...field} data-testid="input-product-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={createProductMutation.isPending} data-testid="button-save-product">
              {createProductMutation.isPending ? "Saving..." : product ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-warehouses">
            Warehouse Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your warehouses, products, and inventory levels
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="warehouses" data-testid="tab-warehouses">Warehouses</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="warehouses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Warehouses</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-warehouse">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Warehouse
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Warehouse</DialogTitle>
                    <DialogDescription>
                      Add a new warehouse to manage inventory and orders.
                    </DialogDescription>
                  </DialogHeader>
                  <WarehouseForm onClose={() => {}} />
                </DialogContent>
              </Dialog>
            </div>

            {warehousesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {warehouses?.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No warehouses found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Create your first warehouse to start managing inventory.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {warehouses?.map((warehouse) => (
                      <Card key={warehouse.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base" data-testid={`warehouse-name-${warehouse.id}`}>
                              {warehouse.name}
                            </CardTitle>
                            <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                              {warehouse.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {warehouse.location && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {warehouse.location}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          {warehouse.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {warehouse.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedWarehouse(warehouse.id)}
                              data-testid={`button-view-warehouse-${warehouse.id}`}
                            >
                              View Details
                            </Button>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" data-testid={`button-edit-warehouse-${warehouse.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-delete-warehouse-${warehouse.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this warehouse? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Products</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-product">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                    <DialogDescription>
                      Add a new product to your inventory catalog.
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm onClose={() => {}} />
                </DialogContent>
              </Dialog>
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center">
                              <Package className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-muted-foreground">No products found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        products?.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium" data-testid={`product-name-${product.id}`}>
                                  {product.name}
                                </div>
                                {product.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {product.description.slice(0, 50)}...
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm" data-testid={`product-sku-${product.id}`}>
                              {product.sku}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                            <TableCell data-testid={`product-price-${product.id}`}>
                              {product.unitPrice ? `$${parseFloat(product.unitPrice).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" data-testid={`button-edit-product-${product.id}`}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-delete-product-${product.id}`}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this product? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Inventory Management</h2>
              <div className="flex space-x-2">
                <Select value={selectedWarehouse || ""} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-48" data-testid="select-warehouse-filter">
                    <SelectValue placeholder="All warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All warehouses</SelectItem>
                    {warehouses?.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button data-testid="button-add-inventory">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </div>

            {inventoryLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Stock Level</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center">
                              <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-muted-foreground">No inventory found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        inventory?.map((item) => {
                          const available = item.quantity - item.reservedQuantity;
                          const isLowStock = item.minStockLevel && available <= item.minStockLevel;
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium" data-testid={`inventory-product-${item.id}`}>
                                    {item.product.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground font-mono">
                                    {item.product.sku}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`inventory-warehouse-${item.id}`}>
                                {item.warehouse.name}
                              </TableCell>
                              <TableCell data-testid={`inventory-quantity-${item.id}`}>
                                {item.quantity}
                              </TableCell>
                              <TableCell data-testid={`inventory-reserved-${item.id}`}>
                                {item.reservedQuantity}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span data-testid={`inventory-available-${item.id}`}>{available}</span>
                                  {isLowStock && (
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {isLowStock ? (
                                  <Badge variant="destructive">Low Stock</Badge>
                                ) : (
                                  <Badge variant="default">Normal</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-inventory-${item.id}`}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}