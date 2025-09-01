import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertOrderSchema, 
  insertExpenseSchema, 
  insertWarehouseSchema,
  insertProductSchema,
  insertInventorySchema,
  insertWarehousePermissionSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const [orderStats, expenseStats, salesData, platformData] = await Promise.all([
        storage.getOrderStats(),
        storage.getExpenseStats(),
        storage.getSalesData(),
        storage.getPlatformDistribution(),
      ]);

      res.json({
        orders: orderStats,
        expenses: expenseStats,
        salesData,
        platformData,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Orders routes
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const filters = {
        platform: req.query.platform as string,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await storage.getOrders(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.patch('/api/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status, notes);
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.post('/api/sync/:platform', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or manager role
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const platform = req.params.platform;
      const orders = await storage.syncOrdersFromPlatform(platform);
      res.json({ message: `Synced ${orders.length} orders from ${platform}`, orders });
    } catch (error) {
      console.error("Error syncing orders:", error);
      res.status(500).json({ message: "Failed to sync orders" });
    }
  });

  // Expenses routes
  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await storage.getExpenses(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData, req.user.claims.sub);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  app.patch('/api/expenses/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or manager role for approval
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { status } = req.body;
      const expense = await storage.updateExpenseStatus(
        req.params.id, 
        status, 
        req.user.claims.sub
      );
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense status:", error);
      res.status(500).json({ message: "Failed to update expense status" });
    }
  });

  // Users routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.toggleUserStatus(req.params.id);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Warehouse routes
  app.get('/api/warehouses', isAuthenticated, async (req: any, res) => {
    try {
      const warehouses = await storage.getWarehouses(req.user.claims.sub);
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.post('/api/warehouses', isAuthenticated, async (req: any, res) => {
    try {
      const warehouseData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(warehouseData, req.user.claims.sub);
      res.status(201).json(warehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(400).json({ message: "Invalid warehouse data" });
    }
  });

  app.get('/api/warehouses/:id', isAuthenticated, async (req, res) => {
    try {
      const warehouse = await storage.getWarehouseById(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      res.status(500).json({ message: "Failed to fetch warehouse" });
    }
  });

  app.patch('/api/warehouses/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertWarehouseSchema.partial().parse(req.body);
      const warehouse = await storage.updateWarehouse(req.params.id, updates);
      res.json(warehouse);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  app.delete('/api/warehouses/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteWarehouse(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId as string;
      const products = await storage.getProducts(warehouseId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData, req.user.claims.sub);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, updates);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Inventory routes
  app.get('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId as string;
      const inventory = await storage.getInventory(warehouseId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.put('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const { warehouseId, productId, quantity } = req.body;
      const inventory = await storage.updateInventory(warehouseId, productId, quantity);
      res.json(inventory);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  app.get('/api/inventory/low-stock', isAuthenticated, async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId as string;
      const lowStockItems = await storage.getLowStockItems(warehouseId);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Warehouse permissions routes
  app.get('/api/warehouses/:id/permissions', isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getWarehousePermissions(req.params.id);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching warehouse permissions:", error);
      res.status(500).json({ message: "Failed to fetch warehouse permissions" });
    }
  });

  app.post('/api/warehouse-permissions', isAuthenticated, async (req, res) => {
    try {
      const permissionData = insertWarehousePermissionSchema.parse(req.body);
      const permission = await storage.addWarehousePermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error adding warehouse permission:", error);
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.patch('/api/warehouse-permissions/:id', isAuthenticated, async (req, res) => {
    try {
      const { permission } = req.body;
      const updated = await storage.updateWarehousePermission(req.params.id, permission);
      res.json(updated);
    } catch (error) {
      console.error("Error updating warehouse permission:", error);
      res.status(500).json({ message: "Failed to update warehouse permission" });
    }
  });

  app.delete('/api/warehouse-permissions/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.removeWarehousePermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing warehouse permission:", error);
      res.status(500).json({ message: "Failed to remove warehouse permission" });
    }
  });

  // Warehouse analytics
  app.get('/api/warehouses/:id/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getWarehouseStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching warehouse stats:", error);
      res.status(500).json({ message: "Failed to fetch warehouse stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
