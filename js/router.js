
/*
 * Personal Skill Tracker
 * Client-side Navigation Router
 */

import { mountCalendar } from "./modules/calendar.js";

const pages = {
    dashboard: {
        title: "Dashboard",
        description: "Your personal skill development overview.",
        message: "Your overall skill progression will appear here.",
    },

    "skill-tree": {
        title: "Skill Tree",
        description: "Explore and organize your skills.",
        message: "Your hierarchical skill tree will appear here.",
    },

    planner: {
        title: "Planner",
        description: "Organize your learning activities.",
        message: "Your learning tasks and plans will appear here.",
    },

    calendar: {
        title: "Calendar",
        description: "View your learning schedule.",
        message: "Your practice sessions and events will appear here.",
    },

    timer: {
        title: "Practice Timer",
        description: "Track the time you spend developing skills.",
        message: "Your practice timer will appear here.",
    },

    achievements: {
        title: "Achievements",
        description: "Track your milestones and accomplishments.",
        message: "Your unlocked achievements will appear here.",
    },

    analytics: {
        title: "Analytics",
        description: "Understand your skill development.",
        message: "Your progress charts and statistics will appear here.",
    },

    portfolio: {
        title: "Portfolio",
        description: "Showcase your skills and evidence.",
        message: "Your skill evidence and portfolio will appear here.",
    },

    settings: {
        title: "Settings",
        description: "Manage your application preferences.",
        message: "Your application settings will appear here.",
    },
};

let activeCalendar = null;

function renderPage(route) {
    const page = pages[route];
    const mainContent = document.getElementById("main-content");

    if (!page || !mainContent) {
        return;
    }

    // Clean up the previous Calendar instance.
    if (activeCalendar) {
        activeCalendar.destroy();
        activeCalendar = null;
    }

    mainContent.innerHTML = `
        <section class="page-section">

            <p class="eyebrow">PERSONAL SKILL TRACKER</p>

            <h1>${page.title}</h1>

            <p class="page-description">
                ${page.description}
            </p>

            ${
                route === "calendar"
                    ? `
                        <div
                            id="calendar-container"
                            class="calendar-page-container"
                        ></div>
                    `
                    : `
                        <div class="page-placeholder">
                            <h2>${page.title}</h2>

                            <p>${page.message}</p>

                            <span class="coming-soon">
                                Feature under development
                            </span>
                        </div>
                    `
            }

        </section>
    `;

    // Mount the Calendar module when its route is active.
    if (route === "calendar") {
        const calendarContainer =
            document.getElementById("calendar-container");

        activeCalendar = mountCalendar(calendarContainer);
    }

    // Update active navigation item.
    document.querySelectorAll(".nav-link").forEach(button => {
        const isActive = button.dataset.route === route;

        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    document.title = `${page.title} | Personal Skill Tracker`;
}

export function navigateTo(route) {
    if (!pages[route]) {
        return;
    }

    if (window.location.hash !== `#${route}`) {
        window.location.hash = route;
    } else {
        renderPage(route);
    }
}

export function initializeRouter() {
    // Handle navigation clicks.
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-route]");

        if (!button) {
            return;
        }

        navigateTo(button.dataset.route);
    });

    // Handle browser back and forward buttons.
    window.addEventListener("hashchange", () => {
        const route = window.location.hash.slice(1);

        renderPage(pages[route] ? route : "dashboard");
    });

    // Load initial page.
    const initialRoute = window.location.hash.slice(1);

    renderPage(pages[initialRoute] ? initialRoute : "dashboard");

    if (!pages[initialRoute]) {
        history.replaceState(null, "", "#dashboard");
    }
}
