
export const ACHIEVEMENT_CATEGORIES = [
    "exploration",
    "practice",
    "proficiency",
    "progression",
    "quests",
    "goals",
    "maintenance",
    "experience"
];

export const ACHIEVEMENT_RARITIES = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary"
];

export const ACHIEVEMENT_CONDITION_TYPES = [
    "skill_count",
    "practice_count",
    "proficiency_level",
    "breakthrough_count",
    "quest_count",
    "goal_count",
    "maintenance_duration",
    "total_xp",
    "player_level"
];

export function validateAchievementDefinition(achievement) {
    if (!achievement || typeof achievement !== "object") {
        throw new Error("Achievement definition must be an object.");
    }

    const requiredStrings = [
        "key",
        "title",
        "description"
    ];

    for (const field of requiredStrings) {
        if (
            typeof achievement[field] !== "string" ||
            achievement[field].trim() === ""
        ) {
            throw new Error(`Achievement ${field} is required.`);
        }
    }

    if (!ACHIEVEMENT_CATEGORIES.includes(achievement.category)) {
        throw new Error("Invalid achievement category.");
    }

    if (!ACHIEVEMENT_RARITIES.includes(achievement.rarity)) {
        throw new Error("Invalid achievement rarity.");
    }

    if (!ACHIEVEMENT_CONDITION_TYPES.includes(achievement.conditionType)) {
        throw new Error("Invalid achievement condition type.");
    }

    if (
        !Number.isInteger(achievement.xpReward) ||
        achievement.xpReward < 0
    ) {
        throw new Error("Achievement XP reward must be a nonnegative integer.");
    }

    if (
        !Number.isInteger(achievement.conditionTarget) ||
        achievement.conditionTarget < 1
    ) {
        throw new Error("Achievement condition target must be a positive integer.");
    }

    if (typeof achievement.isHidden !== "boolean") {
        throw new Error("Achievement isHidden must be a boolean.");
    }

    return true;
}

export function validateAchievementDefinitions(achievements) {
    if (!Array.isArray(achievements)) {
        throw new Error("Achievement definitions must be an array.");
    }

    const keys = new Set();

    for (const achievement of achievements) {
        validateAchievementDefinition(achievement);

        if (keys.has(achievement.key)) {
            throw new Error(
                `Duplicate achievement key: ${achievement.key}`
            );
        }

        keys.add(achievement.key);
    }

    return true;
}

export function validateAchievementUnlock(unlock) {
    if (!unlock || typeof unlock !== "object") {
        throw new Error("Achievement unlock must be an object.");
    }

    if (
        typeof unlock.achievementKey !== "string" ||
        unlock.achievementKey.trim() === ""
    ) {
        throw new Error("Achievement key is required.");
    }

    if (
        !Number.isInteger(unlock.xpAwarded) ||
        unlock.xpAwarded < 0
    ) {
        throw new Error("Awarded XP must be a nonnegative integer.");
    }

    if (
        typeof unlock.unlockedAt !== "string" ||
        Number.isNaN(Date.parse(unlock.unlockedAt))
    ) {
        throw new Error("A valid unlock timestamp is required.");
    }

    return true;
}
