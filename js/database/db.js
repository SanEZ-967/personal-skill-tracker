import Dexie from "dexie";
import { configureDatabase } from "./schema.js";

// Create database instance
export const db = new Dexie("PersonalSkillTrackerDB");

// Configure database schema
configureDatabase(db);