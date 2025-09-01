import {
  users,
  orders,
  expenses,
  orderStatusHistory,
  type User,
  type UpsertUser,
  type InsertUser,
  type Order,
  type InsertOrder,
  type Expense,
  type InsertExpense,
  type ExpenseWithUsers,
  type OrderWithHistory,
  type InsertOrderStatusHistory,
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
