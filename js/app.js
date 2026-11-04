
import { initializeRouter } from "./router.js";
import { db } from "./database/db.js";

async function initializeApp() {
    console.log("Personal Skill Tracker initialized.");
    console.log("Application version: 0.1.0");

    try {
        await db.open();

        console.log("Database initialized successfully.");
        console.log("Database name:", db.name);
        console.log("Database version:", db.verno);

        console.log(
            "Database tables:",
            db.tables.map(table => table.name)
        );

    } catch (error) {
        console.error(
            "Application initialization failed:",
            error
        );

        return;
    }

    initializeRouter();

    console.log("Navigation system initialized.");
}

initializeApp();
