import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const systemSettingsTable = pgTable("system_settings", {
  id: text("id").primaryKey(), // using text so we can just use "singleton" or "global" as fixed id
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
