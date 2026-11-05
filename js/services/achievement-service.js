
import { db } from "../database/db.js";

import {
    getAchievementDefinition
} from "./achievement-definition-service.js";

import {
    validateAchievementUnlock
} from "./achievement-validation-service.js";

function getTimestamp() {
    return new Date().toISOString();
}

export async function unlockAchievement(
    achievementKey,
    metadata = {}
) {
    if (
        typeof achievementKey !== "string" ||
        achievementKey.trim() === ""
    ) {
        throw new Error("Achievement key is required.");
    }

    if (
        metadata === null ||
        typeof metadata !== "object" ||
        Array.isArray(metadata)
    ) {
        throw new Error("Achievement metadata must be an object.");
    }

    const definition = await getAchievementDefinition(
        achievementKey
    );

    if (!definition) {
        throw new Error("Achievement definition not found.");
    }

    return await db.transaction(
        "rw",
        db.achievements,
        async () => {
            const existing = await db.achievements
                .where("achievementKey")
                .equals(achievementKey)
                .first();

            if (existing) {
                return {
                    unlocked: false,
                    alreadyUnlocked: true,
                    achievement: existing
                };
            }

            const unlock = {
                id: crypto.randomUUID(),
                achievementKey: definition.key,
                title: definition.title,
                description: definition.description,
                unlockedAt: getTimestamp(),
                xpAwarded: definition.xpReward,
                metadata: structuredClone(metadata)
            };

            validateAchievementUnlock(unlock);

            await db.achievements.add(unlock);

            return {
                unlocked: true,
                alreadyUnlocked: false,
                achievement: unlock
            };
        }
    );
}

export async function getUnlockedAchievements() {
    return await db.achievements
        .orderBy("unlockedAt")
        .reverse()
        .toArray();
}

export async function getUnlockedAchievement(
    achievementKey
) {
    return await db.achievements
        .where("achievementKey")
        .equals(achievementKey)
        .first() ?? null;
}

export async function hasUnlockedAchievement(
    achievementKey
) {
    const achievement = await getUnlockedAchievement(
        achievementKey
    );

    return achievement !== null;
}

export async function getUnlockedAchievementCount() {
    return await db.achievements.count();
}

export async function getAchievementXP() {
    const achievements = await getUnlockedAchievements();

    return achievements.reduce(
        (total, achievement) =>
            total + (achievement.xpAwarded ?? 0),
        0
    );
}
