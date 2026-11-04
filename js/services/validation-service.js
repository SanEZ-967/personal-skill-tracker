
const VALID_NODE_TYPES = [
    "category",
    "skill",
    "competency"
];

const VALID_RELATIONSHIP_TYPES = [
    "related",
    "prerequisite",
    "supports",
    "overlaps"
];

const VALID_GOAL_STATUSES = [
    "active",
    "completed",
    "paused",
    "cancelled"
];

const VALID_EVIDENCE_TYPES = [
    "project",
    "test",
    "demonstration",
    "certificate",
    "competition",
    "other"
];

const VALID_VERIFICATION_STATUSES = [
    "pending",
    "verified",
    "rejected"
];

const VALID_RESOURCE_TYPES = [
    "book",
    "video",
    "course",
    "website",
    "article",
    "document",
    "other"
];

// ==========================================
// STRING VALIDATION
// ==========================================

export function validateRequiredString(value, fieldName = "Value") {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${fieldName} is required.`);
    }

    return value.trim();
}

// ==========================================
// NODE VALIDATION
// ==========================================

export function validateNodeType(nodeType) {
    if (!VALID_NODE_TYPES.includes(nodeType)) {
        throw new Error("Invalid node type.");
    }

    return true;
}

// ==========================================
// PROFICIENCY VALIDATION
// ==========================================

export function validateProficiencyScore(score) {
    if (
        !Number.isInteger(score) ||
        score < 0 ||
        score > 5
    ) {
        throw new Error(
            "Proficiency score must be an integer between 0 and 5."
        );
    }

    return true;
}

export function validateProficiencyScores({
    knowledgeScore,
    practicalScore,
    consistencyScore
}) {
    validateProficiencyScore(knowledgeScore);
    validateProficiencyScore(practicalScore);
    validateProficiencyScore(consistencyScore);

    return true;
}

// ==========================================
// XP VALIDATION
// ==========================================

export function validateXP(xp) {
    if (!Number.isInteger(xp) || xp < 0) {
        throw new Error(
            "XP must be a nonnegative integer."
        );
    }

    return true;
}

// ==========================================
// DURATION VALIDATION
// ==========================================

export function validateDuration(durationMinutes) {
    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 0
    ) {
        throw new Error(
            "Duration must be a nonnegative integer."
        );
    }

    return true;
}

// ==========================================
// RELATIONSHIP VALIDATION
// ==========================================

export function validateRelationshipType(relationshipType) {
    if (!VALID_RELATIONSHIP_TYPES.includes(relationshipType)) {
        throw new Error("Invalid relationship type.");
    }

    return true;
}

// ==========================================
// GOAL VALIDATION
// ==========================================

export function validateGoalStatus(status) {
    if (!VALID_GOAL_STATUSES.includes(status)) {
        throw new Error("Invalid goal status.");
    }

    return true;
}

// ==========================================
// EVIDENCE VALIDATION
// ==========================================

export function validateEvidenceType(evidenceType) {
    if (!VALID_EVIDENCE_TYPES.includes(evidenceType)) {
        throw new Error("Invalid evidence type.");
    }

    return true;
}

export function validateVerificationStatus(status) {
    if (!VALID_VERIFICATION_STATUSES.includes(status)) {
        throw new Error("Invalid verification status.");
    }

    return true;
}

// ==========================================
// RESOURCE VALIDATION
// ==========================================

export function validateResourceType(resourceType) {
    if (!VALID_RESOURCE_TYPES.includes(resourceType)) {
        throw new Error("Invalid resource type.");
    }

    return true;
}

// ==========================================
// TAG VALIDATION
// ==========================================

export function validateTags(tags) {
    if (
        !Array.isArray(tags) ||
        !tags.every(tag => typeof tag === "string")
    ) {
        throw new Error("Tags must be an array of strings.");
    }

    return true;
}
