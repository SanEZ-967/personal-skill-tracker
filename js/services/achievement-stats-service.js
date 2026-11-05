
import { db } from "../database/db.js";

import { getTotalXP } from "./xp-award-service.js";
import { getPlayerSummary } from "./player-service.js";

import {
    getAllAchievementDefinitions
} from "./achievement-definition-service.js";

// ==========================================
// SKILL COUNT
// ==========================================

async function getSkillCount() {
    return await db.nodes
        .where("nodeType")
        .equals("skill")
        .filter(node => !node.isArchived)
        .count();
}

// ==========================================
// PRACTICE COUNT
// ==========================================

async function getPracticeCount() {
    const logs = await db.practiceLogs.toArray();

    // Quest completion XP records are not practice sessions.
    return logs.filter(log => !log.questId).length;
}

// ==========================================
// COMPLETED QUEST COUNT
// ==========================================

async function getCompletedQuestCount() {
    const goals = await db.goals.toArray();

    return goals.filter(goal =>
        goal.status === "completed" &&
        Object.hasOwn(goal, "questDifficulty")
    ).length;
}

// ==========================================
// COMPLETED GOAL COUNT
// ==========================================

async function getCompletedGoalCount() {
    const goals = await db.goals.toArray();

    return goals.filter(goal =>
        goal.status === "completed" &&
        !Object.hasOwn(goal, "questDifficulty")
    ).length;
}

// ==========================================
// HIGHEST RECOGNIZED PROFICIENCY LEVEL
// ==========================================

async function getHighestProficiencyLevel() {
    const breakthroughs = await db.breakthroughs.toArray();

    if (breakthroughs.length === 0) {
        return 0;
    }

    return Math.max(
        0,
        ...breakthroughs.map(breakthrough => breakthrough.newLevel)
    );
}

// ==========================================
// BREAKTHROUGH COUNT
// ==========================================

async function getBreakthroughCount() {
    return await db.breakthroughs.count();
}

// ==========================================
// CALCULATE LONGEST PRACTICE STREAK
// ==========================================

function calculateLongestPracticeStreak(practiceLogs) {
    if (practiceLogs.length === 0) {
        return 0;
    }

    // Group practice dates by skill.
    const practiceDatesByNode = new Map();

    for (const log of practiceLogs) {
        // Exclude quest completion XP records.
        if (log.questId || !log.nodeId) {
            continue;
        }

        const date = new Date(log.practicedAt);

        if (Number.isNaN(date.getTime())) {
            continue;
        }

        // Normalize dates to UTC calendar days.
        const calendarDay = Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
        );

        if (!practiceDatesByNode.has(log.nodeId)) {
            practiceDatesByNode.set(log.nodeId, []);
        }

        practiceDatesByNode.get(log.nodeId).push(calendarDay);
    }

    let longestStreak = 0;

    // Calculate streaks separately for each skill.
    for (const dates of practiceDatesByNode.values()) {
        dates.sort((a, b) => a - b);

        let streakStart = dates[0];
        let previousDate = dates[0];

        for (let i = 1; i < dates.length; i++) {
            const currentDate = dates[i];

            const gapInDays = Math.floor(
                (currentDate - previousDate) /
                (1000 * 60 * 60 * 24)
            );

            // A gap greater than 30 days resets the streak.
            if (gapInDays > 30) {
                const streakDuration = Math.floor(
                    (previousDate - streakStart) /
                    (1000 * 60 * 60 * 24)
                );

                longestStreak = Math.max(
                    longestStreak,
                    streakDuration
                );

                streakStart = currentDate;
            }

            previousDate = currentDate;
        }

        // Include the final streak for this skill.
        const finalStreakDuration = Math.floor(
            (previousDate - streakStart) /
            (1000 * 60 * 60 * 24)
        );

        longestStreak = Math.max(
            longestStreak,
            finalStreakDuration
        );
    }

    return longestStreak;
}

// ==========================================
// MAINTENANCE ACHIEVEMENT DAYS
// ==========================================

async function getMaintenanceDays() {
    const practiceLogs = await db.practiceLogs.toArray();

    return calculateLongestPracticeStreak(practiceLogs);
}

// ==========================================
// GET ACHIEVEMENT STATISTICS
// ==========================================

export async function getAchievementStats() {
    const [
        skillCount,
        practiceCount,
        completedQuestCount,
        completedGoalCount,
        highestProficiencyLevel,
        breakthroughCount,
        maintenanceDays,
        totalXP,
        playerSummary
    ] = await Promise.all([
        getSkillCount(),
        getPracticeCount(),
        getCompletedQuestCount(),
        getCompletedGoalCount(),
        getHighestProficiencyLevel(),
        getBreakthroughCount(),
        getMaintenanceDays(),
        getTotalXP(),
        getPlayerSummary()
    ]);

    const stats = {
        skillCount,
        practiceCount,
        completedQuestCount,
        completedGoalCount,
        highestProficiencyLevel,
        breakthroughCount,
        maintenanceDays,
        totalXP,
        playerLevel: playerSummary.level
    };

    const definitions = await getAllAchievementDefinitions();

    return {
        ...stats,
        definitionsCount: definitions.length
    };
}
