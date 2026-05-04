import { pgTable, text, timestamp, integer, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "captured", "failed", "refunded"]);

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(), // Razorpay Payment ID
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }), // Preservation of financial history for audits
  subscriptionId: text("subscription_id"),
  amount: integer("amount").notNull(), // in paise
  currency: text("currency").notNull().default("INR"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  method: text("method"),
  orderId: text("order_id"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("payments_user_id_idx").on(table.userId),
  };
});
