
import { db } from "../database/db.js";

import {
    validateProficiencyScores
} from "./validation-service.js";

import {
    calculateOverallLevel,
    getProficiencyDetails
} from "./proficiency-service.js";

import {
    validateNodeReference
} from "./integrity-service.js";

import {
    checkAchievementsSafely
} from "./achievement-check-service.js";

// ==========================================
// CREATE ASSESSMENT
// ==========================================

export async function createAssessment({
    nodeId,
    knowledgeScore,
    practicalScore,
    consistencyScore,
    notes = ""
}) {
    // Validate node reference.
    await validateNodeReference(nodeId);

    // Validate proficiency scores.
    validateProficiencyScores({
        knowledgeScore,
        practicalScore,
        consistencyScore
    });

    if (typeof notes !== "string") {
        throw new Error("Assessment notes must be a string.");
    }

    const assessment = {
        id: crypto.randomUUID(),
        nodeId,
        knowledgeScore,
        practicalScore,
        consistencyScore,
        notes,
        assessedAt: new Date().toISOString()
    };

    await db.assessments.add(assessment);

    // Safely check proficiency-related achievements.
    await checkAchievementsSafely();

    return {
        ...assessment,
        overallLevel: calculateOverallLevel(assessment)
    };
}

// ==========================================
// GET ASSESSMENT
// ==========================================

export async function getAssessment(id) {
    return await db.assessments.get(id);
}

// ==========================================
// GET ALL ASSESSMENTS
// ==========================================

export async function getAllAssessments() {
    return await db.assessments.toArray();
}

// ==========================================
// GET ASSESSMENTS FOR A NODE
// ==========================================

export async function getAssessmentsForNode(nodeId) {
    const assessments = await db.assessments
        .where("nodeId")
        .equals(nodeId)
        .toArray();

    return assessments.sort(
        (a, b) =>
            new Date(b.assessedAt) - new Date(a.assessedAt)
    );
}

// ==========================================
// GET LATEST ASSESSMENT
// ==========================================

export async function getLatestAssessment(nodeId) {
    const assessments = await getAssessmentsForNode(nodeId);

    return assessments.length > 0
        ? assessments[0]
        : null;
}

// ==========================================
// GET ASSESSMENT WITH PROFICIENCY DETAILS
// ==========================================

export async function getAssessmentSummary(id) {
    const assessment = await getAssessment(id);

    if (!assessment) {
        return null;
    }

    const overallLevel = calculateOverallLevel(assessment);

    return {
        ...assessment,
        overallLevel,
        overallDetails: getProficiencyDetails(overallLevel)
    };
}
