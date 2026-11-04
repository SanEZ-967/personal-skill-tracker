
import {
    getTotalXP
} from "./xp-award-service.js";

import {
    calculatePlayerLevel,
    getXPProgress
} from "./xp-service.js";

// ==========================================
// GET PLAYER SUMMARY
// ==========================================

export async function getPlayerSummary() {
    const totalXP = await getTotalXP();

    const progress = getXPProgress(totalXP);

    return {
        totalXP,
        playerLevel: calculatePlayerLevel(totalXP),
        xpIntoLevel: progress.xpIntoLevel,
        xpNeededForLevel: progress.xpNeededForLevel,
        nextLevelXP: progress.nextLevelXP,
        progressPercentage: progress.progressPercentage
    };
}
