import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, Calculator, Search, Filter, BarChart3, DollarSign, Package2 } from "lucide-react";

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

import type { Product, ProductWithInventory, InventoryWithDetails } from "@shared/schema";

export default function Products() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const logoutIfUnauthorized = (error: Error) => {
    if (error.message.includes('Unauthorized')) {
      // Handle unauthorized error
    }
  };

  const { data: products = [], isLoading } = useQuery<ProductWithInventory[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "" || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getTotalInventory = (product: ProductWithInventory) => {
    return product.inventory?.reduce((total, inv) => total + inv.quantity, 0) || 0;
  };

  const getTotalValue = (product: ProductWithInventory) => {
    const totalQty = getTotalInventory(product);
    const price = parseFloat(product.unitPrice || "0");
    return (totalQty * price).toFixed(2);
  };

  const createProductForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category: "other",
    },
  });

  const editProductForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreateDialogOpen(false);
      createProductForm.reset();
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: Error) => {
      logoutIfUnauthorized(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof productSchema>> }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      editProductForm.reset();
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: Error) => {
      logoutIfUnauthorized(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: Error) => {
      logoutIfUnauthorized(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateProduct = (data: z.infer<typeof productSchema>) => {
    createProductMutation.mutate(data);
  };

  const onEditProduct = (data: z.infer<typeof productSchema>) => {
    if (!editingProduct) return;
    updateProductMutation.mutate({ id: editingProduct.id, data });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    editProductForm.reset({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      category: product.category as any,
      unitPrice: product.unitPrice ? parseFloat(product.unitPrice) : undefined,
      costPrice: product.costPrice ? parseFloat(product.costPrice) : undefined,
      weight: product.weight ? parseFloat(product.weight) : undefined,
      dimensions: product.dimensions || "",
      barcode: product.barcode || "",
      brand: product.brand || "",
      supplier: product.supplier || "",
    });
  };

  const calculateProfitMargin = (unitPrice: string | null, costPrice: string | null) => {
    if (!unitPrice || !costPrice) return "N/A";
    const selling = parseFloat(unitPrice);
    const cost = parseFloat(costPrice);
    if (cost === 0) return "N/A";
    const margin = ((selling - cost) / selling * 100).toFixed(1);
    return `${margin}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Product Management</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-product">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your inventory with detailed information
                </DialogDescription>
              </DialogHeader>
              <Form {...createProductForm}>
                <form onSubmit={createProductForm.handleSubmit(onCreateProduct)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createProductForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createProductForm.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter SKU" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createProductForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Product description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createProductForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                      control={createProductForm.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createProductForm.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createProductForm.control}
                      name="costPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createProductForm.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createProductForm.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.001" 
                              placeholder="0.000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createProductForm.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input placeholder="10x5x3 cm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createProductForm.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input placeholder="Barcode number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProductMutation.isPending}>
                      {createProductMutation.isPending ? "Creating..." : "Create Product"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="search" className="text-sm font-medium">Search Products</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by name, SKU, or brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-products"
                />
              </div>
            </div>
            <div>
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
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
            </div>
            {(searchTerm || categoryFilter) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-products">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-active-products">
              {products.filter(p => p.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-inventory">
              {products.reduce((total, product) => total + getTotalInventory(product), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-inventory-value">
              ₹{products.reduce((total, product) => total + parseFloat(getTotalValue(product)), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No products found. Create your first product to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`price-${product.id}`}>
                          ₹{parseFloat(product.unitPrice || "0").toFixed(2)}
                        </TableCell>
                        <TableCell data-testid={`inventory-${product.id}`}>
                          {getTotalInventory(product)} units
                        </TableCell>
                        <TableCell data-testid={`value-${product.id}`}>
                          ₹{getTotalValue(product)}
                        </TableCell>
                        <TableCell>{product.brand || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "default" : "destructive"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(product)}
                                  data-testid={`button-edit-${product.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Product</DialogTitle>
                                  <DialogDescription>
                                    Update product information and pricing
                                  </DialogDescription>
                                </DialogHeader>
                                <Form {...editProductForm}>
                                  <form onSubmit={editProductForm.handleSubmit(onEditProduct)} className="space-y-4">
                                    {/* Same form fields as create form */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={editProductForm.control}
                                        name="name"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Product Name *</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Enter product name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={editProductForm.control}
                                        name="sku"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>SKU *</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Enter SKU" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={editProductForm.control}
                                        name="costPrice"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Cost Price (₹)</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={editProductForm.control}
                                        name="unitPrice"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Selling Price (₹)</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-4">
                                      <Button type="button" variant="outline">
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={updateProductMutation.isPending}>
                                        {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                                      </Button>
                                    </div>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProductMutation.mutate(product.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
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
            </div>
          </CardContent>
        </Card>
    </div>
  );
}