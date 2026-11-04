
import {
    calculateOverallLevel
} from "./proficiency-service.js";

// ==========================================
// PROGRESSION RULES
// ==========================================

export const MAX_PROFICIENCY_LEVEL = 5;

// ==========================================
// GET RECOGNIZED PROFICIENCY
// ==========================================

export function getRecognizedLevel({
    knowledgeScore,
    practicalScore,
    consistencyScore,
    unlockedLevel
}) {
    validateUnlockedLevel(unlockedLevel);

    const assessedLevel = calculateOverallLevel({
        knowledgeScore,
        practicalScore,
        consistencyScore
    });

    return Math.min(assessedLevel, unlockedLevel);
}

// ==========================================
// CHECK BREAKTHROUGH ELIGIBILITY
// ==========================================

export function canAttemptBreakthrough(unlockedLevel) {
    validateUnlockedLevel(unlockedLevel);

    return unlockedLevel < MAX_PROFICIENCY_LEVEL;
}

// ==========================================
// CHECK BREAKTHROUGH REQUIREMENTS
// ==========================================

export function validateBreakthrough({
    unlockedLevel,
    knowledgeScore,
    practicalScore,
    consistencyScore,
    hasPracticalChallenge,
    hasEvidence
}) {
    validateUnlockedLevel(unlockedLevel);

    if (unlockedLevel >= MAX_PROFICIENCY_LEVEL) {
        throw new Error(
            "Maximum proficiency level has already been unlocked."
        );
    }

    const scores = {
        knowledgeScore,
        practicalScore,
        consistencyScore
    };

    const assessedLevel = calculateOverallLevel(scores);
    const targetLevel = unlockedLevel + 1;

    if (assessedLevel < targetLevel) {
        throw new Error(
            "Assessment scores do not meet the next proficiency level."
        );
    }

    if (typeof hasPracticalChallenge !== "boolean") {
        throw new Error(
            "Practical challenge status must be a boolean."
        );
    }

    if (typeof hasEvidence !== "boolean") {
        throw new Error(
            "Evidence status must be a boolean."
        );
    }

    if (!hasPracticalChallenge) {
        throw new Error(
            "A practical challenge must be completed."
        );
    }

    if (!hasEvidence) {
        throw new Error(
            "Supporting evidence is required."
        );
    }

    return {
        eligible: true,
        previousLevel: unlockedLevel,
        newLevel: targetLevel,
        assessedLevel
    };
}

// ==========================================
// VALIDATE UNLOCKED LEVEL
// ==========================================

function validateUnlockedLevel(level) {
    if (
        !Number.isInteger(level) ||
        level < 0 ||
        level > MAX_PROFICIENCY_LEVEL
    ) {
        throw new Error("Invalid unlocked proficiency level.");
    }
}
