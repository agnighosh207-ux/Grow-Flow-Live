import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const templatesTable = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Story, Educational, Viral, Promotional
  platform: varchar("platform", { length: 50 }).notNull(), // Instagram, LinkedIn, etc.
  structure: text("structure").notNull(),
  exampleIdea: text("example_idea"),
  fills: text("fills").array(), // JSON array of fill options
  useCount: integer("use_count").default(0),
  createdBy: text("created_by"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
