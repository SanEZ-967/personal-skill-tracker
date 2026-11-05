
import { db } from "../database/db.js";

import { getXPReward } from "./xp-service.js";
import { validateDuration } from "./validation-service.js";
import { validateNodeReference } from "./integrity-service.js";
import { checkAchievementsSafely } from "./achievement-check-service.js";

// ==========================================
// AWARD XP THROUGH PRACTICE
// ==========================================

export async function recordPractice({
    nodeId = null,
    activity,
    activityType,
    durationMinutes,
    notes = ""
}) {
    // A skill reference is optional for standalone practice.
    if (nodeId !== null) {
        await validateNodeReference(nodeId);
    }

    if (typeof activity !== "string" || !activity.trim()) {
        throw new Error("Practice activity is required.");
    }

    if (typeof notes !== "string") {
        throw new Error("Practice notes must be a string.");
    }

    validateDuration(durationMinutes);

    const xpEarned = getXPReward(activityType);

    const practiceLog = {
        id: crypto.randomUUID(),
        nodeId,
        activity: activity.trim(),
        durationMinutes,
        xpEarned,
        notes,
        practicedAt: new Date().toISOString()
    };

    await db.practiceLogs.add(practiceLog);

    // Safely check practice, XP and player-level achievements.
    await checkAchievementsSafely();

    return practiceLog;
}

// ==========================================
// GET TOTAL XP
// ==========================================

export async function getTotalXP() {
    const [practiceLogs, achievements] = await Promise.all([
        db.practiceLogs.toArray(),
        db.achievements.toArray()
    ]);

    const practiceXP = practiceLogs.reduce(
        (total, log) => total + (log.xpEarned ?? 0),
        0
    );

    const achievementXP = achievements.reduce(
        (total, achievement) =>
            total + (achievement.xpAwarded ?? 0),
        0
    );

    return practiceXP + achievementXP;
}

// ==========================================
// GET XP FOR A SKILL
// ==========================================

export async function getXPForNode(nodeId) {
    const logs = await db.practiceLogs
        .where("nodeId")
        .equals(nodeId)
        .toArray();

    return logs.reduce(
        (total, log) => total + (log.xpEarned ?? 0),
        0
    );
}

// ==========================================
// GET PRACTICE HISTORY
// ==========================================

export async function getPracticeHistory(nodeId) {
    const logs = await db.practiceLogs
        .where("nodeId")
        .equals(nodeId)
        .toArray();

    return logs
        .filter(log => !log.questId)
        .sort(
            (a, b) =>
                new Date(b.practicedAt) - new Date(a.practicedAt)
        );
}

// ==========================================
// GET ALL PRACTICE LOGS
// ==========================================

export async function getAllPracticeLogs() {
    const logs = await db.practiceLogs.toArray();

    return logs
        .filter(log => !log.questId)
        .sort(
            (a, b) =>
                new Date(b.practicedAt) - new Date(a.practicedAt)
        );
}
