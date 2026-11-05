
import achievementData from "../../data/achievements.json";

import {
    validateAchievementDefinitions
} from "./achievement-validation-service.js";

let achievementDefinitions = null;

export async function loadAchievementDefinitions() {
    if (achievementDefinitions !== null) {
        return achievementDefinitions;
    }

    validateAchievementDefinitions(
        achievementData.achievements
    );

    achievementDefinitions = achievementData.achievements;

    return achievementDefinitions;
}

export async function getAllAchievementDefinitions() {
    return await loadAchievementDefinitions();
}

export async function getAchievementDefinition(key) {
    const achievements = await loadAchievementDefinitions();

    return achievements.find(
        achievement => achievement.key === key
    ) ?? null;
}

export async function getAchievementsByCategory(category) {
    const achievements = await loadAchievementDefinitions();

    return achievements.filter(
        achievement => achievement.category === category
    );
}

export async function getAchievementsByRarity(rarity) {
    const achievements = await loadAchievementDefinitions();

    return achievements.filter(
        achievement => achievement.rarity === rarity
    );
}

export async function getVisibleAchievements() {
    const achievements = await loadAchievementDefinitions();

    return achievements.filter(
        achievement => !achievement.isHidden
    );
}

export async function getAchievementDefinitionCount() {
    const achievements = await loadAchievementDefinitions();

    return achievements.length;
}
