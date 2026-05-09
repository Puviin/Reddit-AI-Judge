import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cache for generated drama reel scenes (fal.ai video + ElevenLabs audio).
 * Keyed by storyId so re-visiting a story skips regeneration.
 */
export const reelCache = mysqlTable("reel_cache", {
  id: int("id").autoincrement().primaryKey(),
  storyId: varchar("storyId", { length: 128 }).notNull().unique(),
  storyTitle: text("storyTitle").notNull(),
  scenes: json("scenes").notNull(), // Array of { id, title, mediaUrl, audioUrl, narration, speakerRole }
  sceneCount: int("sceneCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReelCache = typeof reelCache.$inferSelect;
export type InsertReelCache = typeof reelCache.$inferInsert;

/**
 * Cache for Gemini AI story analysis results.
 * Keyed by storyId to avoid re-calling Gemini for the same story.
 */
export const storyAnalysisCache = mysqlTable("story_analysis_cache", {
  id: int("id").autoincrement().primaryKey(),
  storyId: varchar("storyId", { length: 128 }).notNull().unique(),
  analysis: json("analysis").notNull(), // Full Gemini analysis JSON
  characterBible: json("characterBible"), // Gemini character bible JSON
  courtroomDialogue: json("courtroomDialogue"), // Gemini courtroom dialogue JSON
  verdict: json("verdict"), // Gemini verdict JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryAnalysisCache = typeof storyAnalysisCache.$inferSelect;
export type InsertStoryAnalysisCache = typeof storyAnalysisCache.$inferInsert;
