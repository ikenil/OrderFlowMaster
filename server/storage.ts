import {
  users,
  orders,
  expenses,
  orderStatusHistory,
  warehouses,
  products,
  inventory,
  warehousePermissions,
  type User,
  type UpsertUser,
  type InsertUser,
  type Order,
  type InsertOrder,
  type Expense,
  type InsertExpense,
  type ExpenseWithUsers,
  type OrderWithHistory,
  type OrderWithWarehouse,
  type InsertOrderStatusHistory,
  type Warehouse,
  type InsertWarehouse,
  type Product,
  type InsertProduct,
  type Inventory,
  type InsertInventory,
  type InventoryWithDetails,
  type WarehousePermission,
  type InsertWarehousePermission,
  type WarehouseWithDetails,
  type ProductWithInventory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  toggleUserStatus(id: string): Promise<User>;

  // Order operations
  getOrders(filters?: {
    platform?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }>;
  getOrderById(id: string): Promise<OrderWithHistory | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, notes?: string): Promise<Order>;
  syncOrdersFromPlatform(platform: string): Promise<Order[]>;
  getOrderStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    pendingOrders: number;
    returnRate: string;
  }>;

  // Expense operations
  getExpenses(filters?: {
    category?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: ExpenseWithUsers[]; total: number }>;
  createExpense(expense: InsertExpense, submittedBy: string): Promise<Expense>;
  updateExpenseStatus(id: string, status: string, approvedBy?: string): Promise<Expense>;
  getExpenseStats(): Promise<{
    monthlyExpenses: string;
    pendingApprovals: number;
    budgetRemaining: string;
  }>;

  // Analytics
  getSalesData(): Promise<{ month: string; sales: number }[]>;
  getPlatformDistribution(): Promise<{ platform: string; percentage: number }[]>;
  
  // Warehouse operations
  getWarehouses(userId?: string): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<WarehouseWithDetails | undefined>;
  createWarehouse(warehouse: InsertWarehouse, createdBy: string): Promise<Warehouse>;
  updateWarehouse(id: string, updates: Partial<InsertWarehouse>): Promise<Warehouse>;
  deleteWarehouse(id: string): Promise<void>;
  getUserWarehousePermissions(userId: string): Promise<WarehousePermission[]>;
  
  // Product operations
  getProducts(warehouseId?: string): Promise<Product[]>;
  getProductById(id: string): Promise<ProductWithInventory | undefined>;
  createProduct(product: InsertProduct, createdBy: string): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Inventory operations
  getInventory(warehouseId?: string): Promise<InventoryWithDetails[]>;
  createInventory(inventoryData: InsertInventory): Promise<Inventory>;
  updateInventory(warehouseId: string, productId: string, quantity: number): Promise<Inventory>;
  getInventoryByWarehouse(warehouseId: string): Promise<InventoryWithDetails[]>;
  getLowStockItems(warehouseId?: string): Promise<InventoryWithDetails[]>;
  
  // Warehouse permissions
  getWarehousePermissions(warehouseId: string): Promise<WarehousePermission[]>;
  addWarehousePermission(permission: InsertWarehousePermission): Promise<WarehousePermission>;
  updateWarehousePermission(id: string, permission: 'read' | 'write' | 'admin'): Promise<WarehousePermission>;
  removeWarehousePermission(id: string): Promise<void>;
  
  // Warehouse analytics
  getWarehouseStats(warehouseId: string): Promise<{
    totalProducts: number;
    totalValue: string;
    totalCost: string;
    totalProfit: string;
    lowStockItems: number;
    totalOrders: number;
    monthlyRevenue: string;
    monthlyProfit: string;
    profitMargin: string;
  }>;
  
  // Overall analytics
  getOverallStats(): Promise<{
    totalWarehouses: number;
    totalProducts: number;
    totalInventoryValue: string;
    totalProfit: string;
    profitMargin: string;
    topPerformingWarehouses: Array<{
      id: string;
      name: string;
      profit: string;
      profitMargin: string;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: !user.isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Order operations
  async getOrders(filters?: {
    platform?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const conditions = [];
    
    if (filters?.platform) {
      conditions.push(eq(orders.platform, filters.platform as any));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      conditions.push(lte(orders.createdAt, new Date(filters.dateTo)));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(orders.customerName, `%${filters.search}%`),
          like(orders.productName, `%${filters.search}%`),
          like(orders.platformOrderId, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [ordersResult, totalResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(filters?.limit || 20)
        .offset(filters?.offset || 0),
      db
        .select({ count: count() })
        .from(orders)
        .where(whereClause)
    ]);

    return {
      orders: ordersResult,
      total: totalResult[0].count
    };
  }

  async getOrderById(id: string): Promise<OrderWithHistory | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(desc(orderStatusHistory.createdAt));

    return { ...order, statusHistory: history };
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    
    // Add initial status history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: order.status,
      notes: "Order created",
    });

    return order;
  }

  async updateOrderStatus(id: string, status: string, notes?: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: status as any,
      notes: notes || `Status updated to ${status}`,
    });

    return order;
  }

  async syncOrdersFromPlatform(platform: string): Promise<Order[]> {
    // Mock implementation for platform sync
    // In real implementation, this would call the respective platform APIs
    const mockOrders: InsertOrder[] = [
      {
        platformOrderId: `${platform.toUpperCase()}-${Date.now()}-1`,
        platform: platform as any,
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerPhone: "+91 9999999999",
        productName: "Test Product",
        quantity: 1,
        unitPrice: "999.00",
        totalAmount: "999.00",
        status: "pending",
        paymentStatus: "paid",
      }
    ];

    const createdOrders = [];
    for (const orderData of mockOrders) {
      const order = await this.createOrder(orderData);
      createdOrders.push(order);
    }

    return createdOrders;
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    pendingOrders: number;
    returnRate: string;
  }> {
    const [totalOrdersResult] = await db.select({ count: count() }).from(orders);
    const [totalRevenueResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(eq(orders.paymentStatus, 'paid'));
    const [pendingOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, 'pending'));
    const [returnedOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, 'returned'));

    const totalOrders = totalOrdersResult.count;
    const returnedOrders = returnedOrdersResult.count;
    const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : "0.0";

    return {
      totalOrders,
      totalRevenue: totalRevenueResult.sum || "0",
      pendingOrders: pendingOrdersResult.count,
      returnRate,
    };
  }

  // Expense operations
  async getExpenses(filters?: {
    category?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: ExpenseWithUsers[]; total: number }> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(expenses.category, filters.category as any));
    }
    if (filters?.status) {
      conditions.push(eq(expenses.status, filters.status as any));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(expenses.expenseDate, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      conditions.push(lte(expenses.expenseDate, new Date(filters.dateTo)));
    }
    if (filters?.userId) {
      conditions.push(eq(expenses.submittedBy, filters.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [expensesResult, totalResult] = await Promise.all([
      db
        .select({
          expense: expenses,
          submittedByUser: users,
        })
        .from(expenses)
        .innerJoin(users, eq(expenses.submittedBy, users.id))
        .where(whereClause)
        .orderBy(desc(expenses.createdAt))
        .limit(filters?.limit || 20)
        .offset(filters?.offset || 0),
      db
        .select({ count: count() })
        .from(expenses)
        .where(whereClause)
    ]);

    const expensesWithUsers = expensesResult.map(result => ({
      ...result.expense,
      submittedByUser: result.submittedByUser,
    })) as ExpenseWithUsers[];

    return {
      expenses: expensesWithUsers,
      total: totalResult[0].count
    };
  }

  async createExpense(expenseData: InsertExpense, submittedBy: string): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values({ ...expenseData, submittedBy })
      .returning();
    return expense;
  }

  async updateExpenseStatus(id: string, status: string, approvedBy?: string): Promise<Expense> {
    const [expense] = await db
      .update(expenses)
      .set({ 
        status: status as any, 
        approvedBy,
        updatedAt: new Date() 
      })
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  async getExpenseStats(): Promise<{
    monthlyExpenses: string;
    pendingApprovals: number;
    budgetRemaining: string;
  }> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyExpensesResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, currentMonth),
          eq(expenses.status, 'approved')
        )
      );

    const [pendingApprovalsResult] = await db
      .select({ count: count() })
      .from(expenses)
      .where(eq(expenses.status, 'pending'));

    // Mock budget - in real app this would be configurable
    const totalBudget = 200000;
    const spent = parseFloat(monthlyExpensesResult.sum || "0");
    const remaining = totalBudget - spent;

    return {
      monthlyExpenses: monthlyExpensesResult.sum || "0",
      pendingApprovals: pendingApprovalsResult.count,
      budgetRemaining: remaining.toString(),
    };
  }

  // Warehouse operations
  async getWarehouses(userId?: string): Promise<Warehouse[]> {
    let query = db.select().from(warehouses).where(eq(warehouses.isActive, true));
    
    if (userId) {
      // If userId provided, filter by warehouses user has access to
      query = db.select({
        id: warehouses.id,
        name: warehouses.name,
        description: warehouses.description,
        location: warehouses.location,
        isActive: warehouses.isActive,
        createdBy: warehouses.createdBy,
        createdAt: warehouses.createdAt,
        updatedAt: warehouses.updatedAt,
      })
      .from(warehouses)
      .leftJoin(warehousePermissions, eq(warehousePermissions.warehouseId, warehouses.id))
      .where(
        and(
          eq(warehouses.isActive, true),
          or(
            eq(warehouses.createdBy, userId),
            eq(warehousePermissions.userId, userId)
          )
        )
      ) as any;
    }
    
    return await query;
  }

  async getWarehouseById(id: string): Promise<WarehouseWithDetails | undefined> {
    const warehouseResult = await db
      .select()
      .from(warehouses)
      .leftJoin(users, eq(warehouses.createdBy, users.id))
      .where(eq(warehouses.id, id));

    if (warehouseResult.length === 0) return undefined;

    const warehouse = warehouseResult[0].warehouses;
    const creator = warehouseResult[0].users;

    const inventoryResult = await db
      .select()
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.warehouseId, id));

    const permissionsResult = await db
      .select()
      .from(warehousePermissions)
      .leftJoin(users, eq(warehousePermissions.userId, users.id))
      .where(eq(warehousePermissions.warehouseId, id));

    return {
      ...warehouse,
      createdByUser: creator!,
      inventory: inventoryResult.map(r => ({
        ...r.inventory!,
        product: r.products!
      })),
      permissions: permissionsResult.map(r => ({
        ...r.warehouse_permissions!,
        user: r.users!
      }))
    };
  }

  async createWarehouse(warehouseData: InsertWarehouse, createdBy: string): Promise<Warehouse> {
    const [warehouse] = await db
      .insert(warehouses)
      .values({ ...warehouseData, createdBy })
      .returning();
    return warehouse;
  }

  async updateWarehouse(id: string, updates: Partial<InsertWarehouse>): Promise<Warehouse> {
    const [warehouse] = await db
      .update(warehouses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();
    return warehouse;
  }

  async deleteWarehouse(id: string): Promise<void> {
    await db
      .update(warehouses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(warehouses.id, id));
  }

  async getUserWarehousePermissions(userId: string): Promise<WarehousePermission[]> {
    return await db
      .select()
      .from(warehousePermissions)
      .where(eq(warehousePermissions.userId, userId));
  }

  // Product operations
  async getProducts(warehouseId?: string): Promise<Product[]> {
    let query = db.select().from(products).where(eq(products.isActive, true));
    
    if (warehouseId) {
      query = db.select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        description: products.description,
        category: products.category,
        unitPrice: products.unitPrice,
        isActive: products.isActive,
        createdBy: products.createdBy,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(
        and(
          eq(products.isActive, true),
          eq(inventory.warehouseId, warehouseId)
        )
      ) as any;
    }
    
    return await query;
  }

  async getProductById(id: string): Promise<ProductWithInventory | undefined> {
    const productResult = await db
      .select()
      .from(products)
      .leftJoin(users, eq(products.createdBy, users.id))
      .where(eq(products.id, id));

    if (productResult.length === 0) return undefined;

    const product = productResult[0].products;
    const creator = productResult[0].users;

    const inventoryResult = await db
      .select()
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(eq(inventory.productId, id));

    return {
      ...product,
      createdByUser: creator!,
      inventory: inventoryResult.map(r => ({
        ...r.inventory!,
        warehouse: r.warehouses!
      }))
    };
  }

  async createProduct(productData: InsertProduct, createdBy: string): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({ ...productData, createdBy })
      .returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  // Inventory operations
  async createInventory(inventoryData: InsertInventory): Promise<Inventory> {
    const [created] = await db
      .insert(inventory)
      .values(inventoryData)
      .returning();
    return created;
  }

  async getInventory(warehouseId?: string): Promise<InventoryWithDetails[]> {
    let query = db
      .select()
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .leftJoin(products, eq(inventory.productId, products.id));

    if (warehouseId) {
      query = query.where(eq(inventory.warehouseId, warehouseId)) as any;
    }

    const result = await query;
    return result.map(r => ({
      ...r.inventory!,
      warehouse: r.warehouses!,
      product: r.products!
    }));
  }

  async updateInventory(warehouseId: string, productId: string, quantity: number): Promise<Inventory> {
    const [inventoryRecord] = await db
      .insert(inventory)
      .values({ warehouseId, productId, quantity })
      .onConflictDoUpdate({
        target: [inventory.warehouseId, inventory.productId],
        set: { quantity, updatedAt: new Date() }
      })
      .returning();
    return inventoryRecord;
  }

  async getInventoryByWarehouse(warehouseId: string): Promise<InventoryWithDetails[]> {
    return this.getInventory(warehouseId);
  }

  async getLowStockItems(warehouseId?: string): Promise<InventoryWithDetails[]> {
    const baseConditions = [
      sql`${inventory.quantity} <= COALESCE(${inventory.minStockLevel}, 10)`
    ];

    if (warehouseId) {
      baseConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    const result = await db
      .select()
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(and(...baseConditions));

    return result.map(r => ({
      ...r.inventory!,
      warehouse: r.warehouses!,
      product: r.products!
    }));
  }

  // Warehouse permissions
  async getWarehousePermissions(warehouseId: string): Promise<WarehousePermission[]> {
    return await db
      .select()
      .from(warehousePermissions)
      .where(eq(warehousePermissions.warehouseId, warehouseId));
  }

  async addWarehousePermission(permissionData: InsertWarehousePermission): Promise<WarehousePermission> {
    const [permission] = await db
      .insert(warehousePermissions)
      .values(permissionData)
      .returning();
    return permission;
  }

  async updateWarehousePermission(id: string, permission: 'read' | 'write' | 'admin'): Promise<WarehousePermission> {
    const [updated] = await db
      .update(warehousePermissions)
      .set({ permission })
      .where(eq(warehousePermissions.id, id))
      .returning();
    return updated;
  }

  async removeWarehousePermission(id: string): Promise<void> {
    await db
      .delete(warehousePermissions)
      .where(eq(warehousePermissions.id, id));
  }

  // Warehouse analytics
  async getWarehouseStats(warehouseId: string): Promise<{
    totalProducts: number;
    totalValue: string;
    totalCost: string;
    totalProfit: string;
    lowStockItems: number;
    totalOrders: number;
    monthlyRevenue: string;
    monthlyProfit: string;
    profitMargin: string;
  }> {
    const [productCount] = await db
      .select({ count: count() })
      .from(inventory)
      .where(eq(inventory.warehouseId, warehouseId));

    const [valueResult] = await db
      .select({ 
        totalValue: sql<string>`COALESCE(SUM(${inventory.quantity} * COALESCE(${products.unitPrice}, 0)), 0)`,
        totalCost: sql<string>`COALESCE(SUM(${inventory.quantity} * COALESCE(${products.costPrice}, 0)), 0)`
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const [lowStockCount] = await db
      .select({ count: count() })
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          sql`${inventory.quantity} <= COALESCE(${inventory.minStockLevel}, 10)`
        )
      );

    const [orderCount] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.warehouseId, warehouseId));

    // Monthly revenue and profit (last 30 days)
    const [monthlyStats] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        profit: sql<string>`COALESCE(SUM(${orders.profit}), 0)`
      })
      .from(orders)
      .where(
        and(
          eq(orders.warehouseId, warehouseId),
          gte(orders.createdAt, sql`NOW() - INTERVAL '30 days'`)
        )
      );

    const totalValue = parseFloat(valueResult.totalValue || "0");
    const totalCost = parseFloat(valueResult.totalCost || "0");
    const totalProfit = totalValue - totalCost;
    const profitMargin = totalValue > 0 ? ((totalProfit / totalValue) * 100).toFixed(2) : "0";

    return {
      totalProducts: productCount.count,
      totalValue: valueResult.totalValue || "0",
      totalCost: valueResult.totalCost || "0",
      totalProfit: totalProfit.toFixed(2),
      lowStockItems: lowStockCount.count,
      totalOrders: orderCount.count,
      monthlyRevenue: monthlyStats.revenue || "0",
      monthlyProfit: monthlyStats.profit || "0",
      profitMargin: profitMargin + "%",
    };
  }

  // Overall analytics
  async getOverallStats(): Promise<{
    totalWarehouses: number;
    totalProducts: number;
    totalInventoryValue: string;
    totalProfit: string;
    profitMargin: string;
    topPerformingWarehouses: Array<{
      id: string;
      name: string;
      profit: string;
      profitMargin: string;
    }>;
  }> {
    const [warehouseCount] = await db
      .select({ count: count() })
      .from(warehouses)
      .where(eq(warehouses.isActive, true));

    const [productCount] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.isActive, true));

    const [inventoryStats] = await db
      .select({
        totalValue: sql<string>`COALESCE(SUM(${inventory.quantity} * COALESCE(${products.unitPrice}, 0)), 0)`,
        totalCost: sql<string>`COALESCE(SUM(${inventory.quantity} * COALESCE(${products.costPrice}, 0)), 0)`
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id));

    const topWarehouses = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        profit: sql<string>`COALESCE(SUM(${orders.profit}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`
      })
      .from(warehouses)
      .leftJoin(orders, eq(warehouses.id, orders.warehouseId))
      .where(eq(warehouses.isActive, true))
      .groupBy(warehouses.id, warehouses.name)
      .orderBy(sql`COALESCE(SUM(${orders.profit}), 0) DESC`)
      .limit(5);

    const totalValue = parseFloat(inventoryStats.totalValue || "0");
    const totalCost = parseFloat(inventoryStats.totalCost || "0");
    const totalProfit = totalValue - totalCost;
    const profitMargin = totalValue > 0 ? ((totalProfit / totalValue) * 100).toFixed(2) : "0";

    return {
      totalWarehouses: warehouseCount.count,
      totalProducts: productCount.count,
      totalInventoryValue: inventoryStats.totalValue || "0",
      totalProfit: totalProfit.toFixed(2),
      profitMargin: profitMargin + "%",
      topPerformingWarehouses: topWarehouses.map(w => ({
        id: w.id,
        name: w.name,
        profit: w.profit || "0",
        profitMargin: parseFloat(w.revenue || "0") > 0 
          ? (((parseFloat(w.profit || "0") / parseFloat(w.revenue || "0")) * 100).toFixed(2) + "%")
          : "0%"
      }))
    };
  }

  // Analytics
  async getSalesData(): Promise<{ month: string; sales: number }[]> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    // Mock data - in real app this would query actual sales data
    return months.map((month, index) => ({
      month,
      sales: Math.floor(Math.random() * 50000) + 30000
    }));
  }

  async getPlatformDistribution(): Promise<{ platform: string; percentage: number }[]> {
    // Mock data - in real app this would calculate from actual orders
    return [
      { platform: 'Amazon', percentage: 45 },
      { platform: 'Flipkart', percentage: 30 },
      { platform: 'Meesho', percentage: 15 },
      { platform: 'Website', percentage: 10 },
    ];
  }
}

export const storage = new DatabaseStorage();
