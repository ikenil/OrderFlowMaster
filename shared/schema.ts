import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"), // admin, manager, viewer
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']);
export const platformEnum = pgEnum('platform', ['amazon', 'flipkart', 'meesho', 'website']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'approved', 'rejected', 'paid']);
export const expenseCategoryEnum = pgEnum('expense_category', ['marketing', 'shipping', 'packaging', 'office', 'travel', 'other']);
export const warehousePermissionEnum = pgEnum('warehouse_permission', ['read', 'write', 'admin']);
export const productCategoryEnum = pgEnum('product_category', ['electronics', 'clothing', 'books', 'home', 'beauty', 'sports', 'toys', 'other']);

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformOrderId: varchar("platform_order_id").notNull(),
  platform: platformEnum("platform").notNull(),
  warehouseId: varchar("warehouse_id").references(() => warehouses.id),
  productId: varchar("product_id").references(() => products.id),
  customerName: varchar("customer_name").notNull(),
  customerEmail: varchar("customer_email"),
  customerPhone: varchar("customer_phone"),
  customerAddress: text("customer_address"),
  productName: varchar("product_name").notNull(),
  productSku: varchar("product_sku"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default('pending'),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default('pending'),
  paymentMethod: varchar("payment_method"),
  transactionId: varchar("transaction_id"),
  shippingAddress: text("shipping_address"),
  trackingNumber: varchar("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: varchar("description").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: expenseStatusEnum("status").notNull().default('pending'),
  receipt: varchar("receipt_url"),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  expenseDate: timestamp("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order status history for timeline
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Warehouses table
export const warehouses = pgTable("warehouses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  location: varchar("location"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  sku: varchar("sku").notNull().unique(),
  description: text("description"),
  category: productCategoryEnum("category").notNull().default('other'),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory table - tracks product quantities per warehouse
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: varchar("warehouse_id").notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0), // for pending orders
  minStockLevel: integer("min_stock_level").default(0),
  maxStockLevel: integer("max_stock_level"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Warehouse permissions - role-based access to warehouses
export const warehousePermissions = pgTable("warehouse_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  warehouseId: varchar("warehouse_id").notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  permission: warehousePermissionEnum("permission").notNull().default('read'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submittedExpenses: many(expenses, { relationName: 'submittedExpenses' }),
  approvedExpenses: many(expenses, { relationName: 'approvedExpenses' }),
  createdWarehouses: many(warehouses),
  createdProducts: many(products),
  warehousePermissions: many(warehousePermissions),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [warehouses.createdBy],
    references: [users.id],
  }),
  inventory: many(inventory),
  permissions: many(warehousePermissions),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  inventory: many(inventory),
  orders: many(orders),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [inventory.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export const warehousePermissionsRelations = relations(warehousePermissions, ({ one }) => ({
  user: one(users, {
    fields: [warehousePermissions.userId],
    references: [users.id],
  }),
  warehouse: one(warehouses, {
    fields: [warehousePermissions.warehouseId],
    references: [warehouses.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  statusHistory: many(orderStatusHistory),
  warehouse: one(warehouses, {
    fields: [orders.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  submittedByUser: one(users, {
    fields: [expenses.submittedBy],
    references: [users.id],
    relationName: 'submittedExpenses',
  }),
  approvedByUser: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id],
    relationName: 'approvedExpenses',
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Upsert user schema for auth (includes id)
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedBy: true,
  approvedBy: true,
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  updatedAt: true,
});

export const insertWarehousePermissionSchema = createInsertSchema(warehousePermissions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertWarehousePermission = z.infer<typeof insertWarehousePermissionSchema>;
export type WarehousePermission = typeof warehousePermissions.$inferSelect;

// Extended types with relations
export type OrderWithHistory = Order & {
  statusHistory: OrderStatusHistory[];
};

export type ExpenseWithUsers = Expense & {
  submittedByUser: User;
  approvedByUser?: User;
};

export type WarehouseWithDetails = Warehouse & {
  createdByUser: User;
  inventory: (Inventory & { product: Product })[];
  permissions: (WarehousePermission & { user: User })[];
};

export type InventoryWithDetails = Inventory & {
  warehouse: Warehouse;
  product: Product;
};

export type ProductWithInventory = Product & {
  createdByUser: User;
  inventory: (Inventory & { warehouse: Warehouse })[];
};

export type OrderWithWarehouse = Order & {
  statusHistory: OrderStatusHistory[];
  warehouse?: Warehouse;
  product?: Product;
};
