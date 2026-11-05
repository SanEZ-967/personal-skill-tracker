
import { getAllAchievementDefinitions } from "./achievement-definition-service.js";

import {
    unlockAchievement,
    getUnlockedAchievements
} from "./achievement-service.js";

import {
    getAchievementStats
} from "./achievement-stats-service.js";

import {
    evaluateAchievementCondition
} from "./achievement-condition-service.js";

// ==========================================
// CHECK AND UNLOCK ELIGIBLE ACHIEVEMENTS
// ==========================================

export async function checkAchievements() {
    const definitions = await getAllAchievementDefinitions();

    const stats = await getAchievementStats();

    const unlockedAchievements = await getUnlockedAchievements();

    const unlockedKeys = new Set(
        unlockedAchievements.map(
            achievement => achievement.achievementKey
        )
    );

    const newlyUnlocked = [];

    for (const definition of definitions) {
        // Skip achievements that have already been unlocked.
        if (unlockedKeys.has(definition.key)) {
            continue;
        }

        // Evaluate the achievement condition.
        const result = evaluateAchievementCondition(
            definition,
            stats
        );

        if (!result.isEligible) {
            continue;
        }

        // Unlock the achievement.
        const outcome = await unlockAchievement(
            definition.key,
            {
                conditionType: definition.conditionType,
                currentValue: result.current,
                targetValue: result.target
            }
        );

        if (outcome.unlocked) {
            newlyUnlocked.push(outcome.achievement);

            unlockedKeys.add(definition.key);
        }
    }

    return {
        checked: definitions.length,
        unlockedCount: newlyUnlocked.length,
        newlyUnlocked
    };
}

// ==========================================
// SAFE ACHIEVEMENT CHECK
// ==========================================

export async function checkAchievementsSafely() {
    try {
        return await checkAchievements();
    } catch (error) {
        console.error(
            "Achievement checking failed:",
            error
        );

        return {
            checked: false,
            unlockedCount: 0,
            newlyUnlocked: [],
            error: error.message
        };
    }
}

// ==========================================
// GET ACHIEVEMENT PROGRESS OVERVIEW
// ==========================================

export async function getAchievementProgressOverview() {
    const definitions = await getAllAchievementDefinitions();

    const stats = await getAchievementStats();

    const unlockedAchievements = await getUnlockedAchievements();

    const unlockedKeys = new Set(
        unlockedAchievements.map(
            achievement => achievement.achievementKey
        )
    );

    return definitions.map(definition => {
        const result = evaluateAchievementCondition(
            definition,
            stats
        );

        const isUnlocked = unlockedKeys.has(definition.key);

        return {
            ...definition,
            currentValue: result.current,
            targetValue: result.target,
            progressPercentage: result.progressPercentage,
            isEligible: result.isEligible,
            isUnlocked
        };
    });
}
