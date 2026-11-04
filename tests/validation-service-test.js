
import {
    validateRequiredString,
    validateNodeType,
    validateProficiencyScore,
    validateProficiencyScores,
    validateXP,
    validateDuration,
    validateRelationshipType,
    validateGoalStatus,
    validateEvidenceType,
    validateVerificationStatus,
    validateResourceType,
    validateTags
} from "../js/services/validation-service.js";

export function runValidationServiceTests() {
    console.log("Starting validation service tests...");

    function expectValid(name, callback) {
        try {
            callback();
            console.log(`PASS: ${name}`);
        } catch (error) {
            console.error(`FAIL: ${name}`, error);
        }
    }

    function expectInvalid(name, callback) {
        try {
            callback();
            console.error(`FAIL: ${name} - Invalid value was accepted.`);
        } catch {
            console.log(`PASS: ${name}`);
        }
    }

    // Required string
    expectValid("Accept valid required string", () =>
        validateRequiredString("Mathematics")
    );

    expectInvalid("Reject empty required string", () =>
        validateRequiredString("   ")
    );

    // Node type
    expectValid("Accept valid node type", () =>
        validateNodeType("skill")
    );

    expectInvalid("Reject invalid node type", () =>
        validateNodeType("invalid")
    );

    // Proficiency scores
    expectValid("Accept proficiency score 0", () =>
        validateProficiencyScore(0)
    );

    expectValid("Accept proficiency score 5", () =>
        validateProficiencyScore(5)
    );

    expectInvalid("Reject proficiency score below 0", () =>
        validateProficiencyScore(-1)
    );

    expectInvalid("Reject proficiency score above 5", () =>
        validateProficiencyScore(6)
    );

    expectInvalid("Reject decimal proficiency score", () =>
        validateProficiencyScore(2.5)
    );

    expectValid("Accept all valid proficiency scores", () =>
        validateProficiencyScores({
            knowledgeScore: 3,
            practicalScore: 4,
            consistencyScore: 2
        })
    );

    // XP
    expectValid("Accept valid XP", () =>
        validateXP(100)
    );

    expectInvalid("Reject negative XP", () =>
        validateXP(-10)
    );

    expectInvalid("Reject decimal XP", () =>
        validateXP(10.5)
    );

    // Duration
    expectValid("Accept valid duration", () =>
        validateDuration(30)
    );

    expectInvalid("Reject negative duration", () =>
        validateDuration(-5)
    );

    // Relationships
    expectValid("Accept valid relationship type", () =>
        validateRelationshipType("prerequisite")
    );

    expectInvalid("Reject invalid relationship type", () =>
        validateRelationshipType("invalid")
    );

    // Goals
    expectValid("Accept valid goal status", () =>
        validateGoalStatus("active")
    );

    expectInvalid("Reject invalid goal status", () =>
        validateGoalStatus("invalid")
    );

    // Evidence
    expectValid("Accept valid evidence type", () =>
        validateEvidenceType("project")
    );

    expectInvalid("Reject invalid evidence type", () =>
        validateEvidenceType("invalid")
    );

    // Verification
    expectValid("Accept valid verification status", () =>
        validateVerificationStatus("verified")
    );

    expectInvalid("Reject invalid verification status", () =>
        validateVerificationStatus("invalid")
    );

    // Resources
    expectValid("Accept valid resource type", () =>
        validateResourceType("book")
    );

    expectInvalid("Reject invalid resource type", () =>
        validateResourceType("invalid")
    );

    // Tags
    expectValid("Accept valid tags", () =>
        validateTags(["math", "science"])
    );

    expectInvalid("Reject invalid tags", () =>
        validateTags("math")
    );

    expectInvalid("Reject non-string tags", () =>
        validateTags(["math", 123])
    );

    console.log("Validation service tests completed.");
}
