
import { getTotalXP, getAllPracticeLogs } from "../services/xp-award-service.js";

import {
    calculatePlayerLevel,
    getXPProgress
} from "../services/xp-service.js";

import { getActiveNodes } from "../services/node-service.js";

import {
    getMaintenanceSummary
} from "../services/maintenance-service.js";

import {
    getActiveGoals
} from "../services/goal-service.js";

import {
    getUpcomingActivities
} from "../services/planner-service.js";

import {
    getUnlockedAchievements
} from "../services/achievement-service.js";

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function formatDate(dateString) {
    if (!dateString) return "No date";

    return new Date(dateString).toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}

function formatTime(timeString) {
    if (!timeString) return "";

    const [hours, minutes] = timeString.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function renderPractice(logs) {
    if (logs.length === 0) {
        return "<p>No practice sessions recorded yet.</p>";
    }

    return `
        <div class="dashboard-list">
            ${logs.slice(0, 5).map(log => `
                <div class="dashboard-list-item">
                    <div>
                        <strong>${escapeHTML(log.activity)}</strong>
                        <p>${formatDate(log.practicedAt)}</p>
                    </div>
                    <span>${log.xpEarned ?? 0} XP</span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderMaintenance(summary) {
    const alerts = summary.urgentSkills.slice(0, 5);

    if (alerts.length === 0 && summary.needsAttention === 0 &&
        summary.neverPracticed === 0) {
        return "<p>All your tracked skills are in good maintenance condition.</p>";
    }

    return `
        <div class="dashboard-maintenance-summary">
            <span>Needs attention: ${summary.needsAttention}</span>
            <span>Never practiced: ${summary.neverPracticed}</span>
            <span>At risk: ${summary.atRisk}</span>
            <span>Overdue: ${summary.overdue}</span>
        </div>

        ${alerts.length > 0 ? `
            <div class="dashboard-list">
                ${alerts.map(skill => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${escapeHTML(skill.nodeName)}</strong>
                            <p>${escapeHTML(skill.label)}</p>
                        </div>
                        <span>${escapeHTML(skill.priority)}</span>
                    </div>
                `).join("")}
            </div>
        ` : ""}
    `;
}

function renderGoals(goals) {
    if (goals.length === 0) {
        return "<p>No active goals or quests.</p>";
    }

    return `
        <div class="dashboard-list">
            ${goals.slice(0, 5).map(goal => {
                const isQuest = Object.hasOwn(goal, "questDifficulty");
                const current = goal.progressCurrent ?? 0;
                const target = goal.progressTarget ?? 1;
                const percentage = isQuest
                    ? Math.round((current / target) * 100)
                    : 0;

                return `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${escapeHTML(goal.title)}</strong>
                            <p>
                                ${isQuest ? "Quest" : "Goal"}
                                ${goal.deadline
                                    ? ` · Due ${formatDate(goal.deadline)}`
                                    : ""}
                            </p>
                            ${isQuest ? `
                                <p>${current}/${target} progress (${percentage}%)</p>
                            ` : ""}
                        </div>
                        <span>${isQuest
                            ? escapeHTML(goal.questDifficulty)
                            : "Active"}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderActivities(activities) {
    if (activities.length === 0) {
        return "<p>No upcoming Planner activities.</p>";
    }

    return `
        <div class="dashboard-list">
            ${activities.slice(0, 5).map(activity => `
                <div class="dashboard-list-item">
                    <div>
                        <strong>${escapeHTML(activity.title)}</strong>
                        <p>
                            ${formatDate(activity.scheduledDate)}
                            · ${formatTime(activity.startTime)}
                        </p>
                    </div>
                    <span>${activity.durationMinutes} min</span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderAchievements(achievements) {
    if (achievements.length === 0) {
        return "<p>No achievements unlocked yet. Keep practicing!</p>";
    }

    return `
        <div class="dashboard-list">
            ${achievements.slice(0, 5).map(achievement => `
                <div class="dashboard-list-item">
                    <div>
                        <strong>${escapeHTML(achievement.title)}</strong>
                        <p>${escapeHTML(achievement.description)}</p>
                        <p>${formatDate(achievement.unlockedAt)}</p>
                    </div>
                    <span>+${achievement.xpAwarded ?? 0} XP</span>
                </div>
            `).join("")}
        </div>
    `;
}

export function mountDashboard(container) {
    if (!container) {
        throw new Error("Dashboard container not found.");
    }

    let destroyed = false;

    container.innerHTML = `
        <div class="dashboard-container">

            <section class="dashboard-welcome">
                <h2>Welcome back!</h2>
                <p>Here's an overview of your personal development.</p>
            </section>

            <section class="dashboard-stats">
                <h2>Progress Overview</h2>

                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Player Level</h3>
                        <p id="dashboard-player-level">Loading...</p>
                        <div class="dashboard-progress-track">
                            <div
                                id="dashboard-xp-progress"
                                class="dashboard-progress-fill"
                            ></div>
                        </div>
                        <small id="dashboard-xp-progress-label"></small>
                    </div>

                    <div class="dashboard-card">
                        <h3>Total XP</h3>
                        <p id="dashboard-total-xp">Loading...</p>
                    </div>

                    <div class="dashboard-card">
                        <h3>Total Skills</h3>
                        <p id="dashboard-total-skills">Loading...</p>
                    </div>

                    <div class="dashboard-card">
                        <h3>Practice Sessions</h3>
                        <p id="dashboard-practice-count">Loading...</p>
                    </div>
                </div>
            </section>

            <section class="dashboard-section">
                <h2>Recent Practice</h2>
                <div id="dashboard-practice">Loading...</div>
            </section>

            <section class="dashboard-section">
                <h2>Skill Maintenance</h2>
                <div id="dashboard-maintenance">Loading...</div>
            </section>

            <section class="dashboard-section">
                <h2>Active Goals & Quests</h2>
                <div id="dashboard-goals">Loading...</div>
            </section>

            <section class="dashboard-section">
                <h2>Upcoming Activities</h2>
                <div id="dashboard-activities">Loading...</div>
            </section>

            <section class="dashboard-section">
                <h2>Recent Achievements</h2>
                <div id="dashboard-achievements">Loading...</div>
            </section>

        </div>
    `;

    function setText(id, value) {
        const element = container.querySelector(`#${id}`);

        if (element) {
            element.textContent = value;
        }
    }

    function setHTML(id, value) {
        const element = container.querySelector(`#${id}`);

        if (element) {
            element.innerHTML = value;
        }
    }

    async function refresh() {
        try {
            const [
                totalXP,
                practiceLogs,
                nodes,
                maintenance,
                goals,
                activities,
                achievements
            ] = await Promise.all([
                getTotalXP(),
                getAllPracticeLogs(),
                getActiveNodes(),
                getMaintenanceSummary(),
                getActiveGoals(),
                getUpcomingActivities(
                    new Date().toLocaleDateString("en-CA")
                ),
                getUnlockedAchievements()
            ]);

            if (destroyed) return;

            const skillCount = nodes.filter(
                node => node.nodeType === "skill"
            ).length;

            const level = calculatePlayerLevel(totalXP);
            const progress = getXPProgress(totalXP);

            setText("dashboard-player-level", `Level ${level}`);
            setText("dashboard-total-xp", totalXP.toLocaleString());
            setText("dashboard-total-skills", skillCount.toLocaleString());
            setText("dashboard-practice-count", practiceLogs.length.toLocaleString());

            const progressBar = container.querySelector(
                "#dashboard-xp-progress"
            );

            if (progressBar) {
                progressBar.style.width =
                    `${progress.progressPercentage}%`;
            }

            setText(
                "dashboard-xp-progress-label",
                `${progress.xpIntoLevel} / ${progress.xpNeededForLevel} XP to next level`
            );

            setHTML(
                "dashboard-practice",
                renderPractice(practiceLogs)
            );

            setHTML(
                "dashboard-maintenance",
                renderMaintenance(maintenance)
            );

            setHTML(
                "dashboard-goals",
                renderGoals(goals)
            );

            setHTML(
                "dashboard-activities",
                renderActivities(activities)
            );

            setHTML(
                "dashboard-achievements",
                renderAchievements(achievements)
            );

        } catch (error) {
            console.error("Dashboard loading failed:", error);

            if (!destroyed) {
                container.querySelectorAll(
                    ".dashboard-section > div"
                ).forEach(element => {
                    element.textContent =
                        "Unable to load this information.";
                });
            }
        }
    }

    refresh();

    return {
        refresh,

        destroy() {
            destroyed = true;
            container.innerHTML = "";
        }
    };
}
