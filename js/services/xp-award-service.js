
import { db } from "../database/db.js";

import {
    getXPReward
} from "./xp-service.js";

import {
    validateDuration
} from "./validation-service.js";

import {
    validateNodeReference
} from "./integrity-service.js";

// ==========================================
// AWARD XP THROUGH PRACTICE
// ==========================================

export async function recordPractice({
    nodeId,
    activity,
    activityType,
    durationMinutes,
    notes = ""
}) {
    await validateNodeReference(nodeId);

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

    return practiceLog;
}

// ==========================================
// GET TOTAL XP
// ==========================================

export async function getTotalXP() {
    const logs = await db.practiceLogs.toArray();

    return logs.reduce(
        (total, log) => total + log.xpEarned,
        0
    );
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
        (total, log) => total + log.xpEarned,
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

    return logs.sort(
        (a, b) =>
            new Date(b.practicedAt) - new Date(a.practicedAt)
    );
}

// ==========================================
// GET ALL PRACTICE LOGS
// ==========================================

export async function getAllPracticeLogs() {
    const logs = await db.practiceLogs.toArray();

    return logs.sort(
        (a, b) =>
            new Date(b.practicedAt) - new Date(a.practicedAt)
    );
}
