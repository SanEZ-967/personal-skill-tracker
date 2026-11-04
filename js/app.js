
/*
 * Personal Skill Tracker
 * Main Application Entry Point
 */

import { initializeRouter } from "./router.js";

function initializeApp() {
    console.log("Personal Skill Tracker initialized.");
    console.log("Application version: 0.1.0");

    initializeRouter();

    console.log("Navigation system initialized.");
}

// Start the application
initializeApp();
