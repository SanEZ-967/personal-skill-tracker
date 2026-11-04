
import {
    validateXP
} from "./validation-service.js";

// ==========================================
// XP REWARD CONSTANTS
// ==========================================

export const XP_REWARDS = {
    SHORT_PRACTICE: 10,
    STANDARD_PRACTICE: 20,
    FOCUSED_PRACTICE: 35,
    EXTENDED_PRACTICE: 50,
    PERSONAL_CHALLENGE: 75,
    MAJOR_PROJECT: 150
};

// ==========================================
// PLAYER LEVEL CONSTANTS
// ==========================================

export const XP_PER_LEVEL = 100;

// ==========================================
// CALCULATE PLAYER LEVEL
// ==========================================

export function calculatePlayerLevel(totalXP) {
    validateXP(totalXP);

    return Math.floor(
        Math.sqrt(totalXP / XP_PER_LEVEL)
    ) + 1;
}

// ==========================================
// CALCULATE XP REQUIRED FOR A LEVEL
// ==========================================

export function getXPRequiredForLevel(level) {
    if (!Number.isInteger(level) || level < 1) {
        throw new Error("Player level must be a positive integer.");
    }

    return XP_PER_LEVEL * level ** 2;
}

// ==========================================
// GET XP PROGRESS
// ==========================================

export function getXPProgress(totalXP) {
    validateXP(totalXP);

    const currentLevel = calculatePlayerLevel(totalXP);

    const currentLevelXP = getXPRequiredForLevel(
        currentLevel - 1 || 1
    );

    const nextLevelXP = getXPRequiredForLevel(
        currentLevel
    );

    // Level 1 starts at 0 XP
    const progressStartXP = currentLevel === 1
        ? 0
        : currentLevelXP;

    const xpIntoLevel = totalXP - progressStartXP;
    const xpNeededForLevel = nextLevelXP - progressStartXP;

    return {
        currentLevel,
        totalXP,
        xpIntoLevel,
        xpNeededForLevel,
        nextLevelXP,
        progressPercentage: Math.min(
            100,
            Math.floor(
                (xpIntoLevel / xpNeededForLevel) * 100
            )
        )
    };
}

// ==========================================
// GET XP REWARD
// ==========================================


export function getXPProgress(totalXP) {
    validateXP(totalXP);

    const currentLevel = calculatePlayerLevel(totalXP);

    const progressStartXP = currentLevel === 1
        ? 0
        : getXPRequiredForLevel(currentLevel - 1);

    const nextLevelXP = getXPRequiredForLevel(currentLevel);

    const xpIntoLevel = totalXP - progressStartXP;
    const xpNeededForLevel = nextLevelXP - progressStartXP;

    return {
        currentLevel,
        totalXP,
        xpIntoLevel,
        xpNeededForLevel,
        nextLevelXP,
        progressPercentage: Math.min(
            100,
            Math.floor(
                (xpIntoLevel / xpNeededForLevel) * 100
            )
        )
    };
}
