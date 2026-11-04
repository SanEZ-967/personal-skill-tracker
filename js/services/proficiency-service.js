
import {
    validateProficiencyScores
} from "./validation-service.js";

// ==========================================
// PROFICIENCY LEVELS
// ==========================================

export const PROFICIENCY_LEVELS = [
    {
        score: 0,
        name: "Unfamiliar",
        description: "No meaningful understanding or experience."
    },
    {
        score: 1,
        name: "Beginner",
        description: "Basic awareness and initial attempts."
    },
    {
        score: 2,
        name: "Basic",
        description: "Can perform simple tasks with guidance."
    },
    {
        score: 3,
        name: "Intermediate",
        description: "Can work independently in familiar situations."
    },
    {
        score: 4,
        name: "Advanced",
        description: "Handles complex situations confidently."
    },
    {
        score: 5,
        name: "Expert",
        description: "Demonstrates mastery in demanding situations."
    }
];

// ==========================================
// CALCULATE OVERALL PROFICIENCY
// ==========================================

export function calculateOverallLevel({
    knowledgeScore,
    practicalScore,
    consistencyScore
}) {
    validateProficiencyScores({
        knowledgeScore,
        practicalScore,
        consistencyScore
    });

    const average = (
        knowledgeScore +
        practicalScore +
        consistencyScore
    ) / 3;

    return Math.round(average);
}

// ==========================================
// GET PROFICIENCY DETAILS
// ==========================================

export function getProficiencyDetails(score) {
    if (!Number.isInteger(score) || score < 0 || score > 5) {
        throw new Error("Invalid proficiency score.");
    }

    return PROFICIENCY_LEVELS[score];
}

// ==========================================
// GET COMPLETE PROFICIENCY SUMMARY
// ==========================================

export function getProficiencySummary(scores) {
    const overallLevel = calculateOverallLevel(scores);

    return {
        knowledge: {
            score: scores.knowledgeScore,
            ...getProficiencyDetails(scores.knowledgeScore)
        },

        practical: {
            score: scores.practicalScore,
            ...getProficiencyDetails(scores.practicalScore)
        },

        consistency: {
            score: scores.consistencyScore,
            ...getProficiencyDetails(scores.consistencyScore)
        },

        overall: {
            score: overallLevel,
            ...getProficiencyDetails(overallLevel)
        }
    };
}
