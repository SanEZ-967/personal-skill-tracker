
const CONDITION_STAT_FIELDS = {
    skill_count: "skillCount",
    practice_count: "practiceCount",
    proficiency_level: "highestProficiencyLevel",
    breakthrough_count: "breakthroughCount",
    quest_count: "completedQuestCount",
    goal_count: "completedGoalCount",
    maintenance_duration: "maintenanceDays",
    total_xp: "totalXP",
    player_level: "playerLevel"
};

export function evaluateAchievementCondition(
    definition,
    stats
) {
    if (!definition || typeof definition !== "object") {
        throw new Error("Achievement definition is required.");
    }

    if (!stats || typeof stats !== "object") {
        throw new Error("Achievement statistics are required.");
    }

    const statField = CONDITION_STAT_FIELDS[
        definition.conditionType
    ];

    if (!statField) {
        throw new Error(
            `Unsupported achievement condition: ${definition.conditionType}`
        );
    }

    const currentValue = stats[statField];

    if (
        typeof currentValue !== "number" ||
        !Number.isFinite(currentValue) ||
        currentValue < 0
    ) {
        throw new Error(
            `Invalid achievement statistic: ${statField}`
        );
    }

    return {
        achievementKey: definition.key,
        conditionType: definition.conditionType,
        currentValue,
        targetValue: definition.conditionTarget,
        isEligible: currentValue >= definition.conditionTarget,
        progressPercentage: Math.min(
            100,
            Math.floor(
                (currentValue / definition.conditionTarget) * 100
            )
        )
    };
}

export function getAchievementProgress(
    definition,
    stats
) {
    const result = evaluateAchievementCondition(
        definition,
        stats
    );

    return {
        ...result,
        isComplete: result.isEligible
    };
}

export function evaluateAllAchievementConditions(
    definitions,
    stats
) {
    if (!Array.isArray(definitions)) {
        throw new Error("Achievement definitions must be an array.");
    }

    return definitions.map(definition =>
        evaluateAchievementCondition(definition, stats)
    );
}

export function getEligibleAchievements(
    definitions,
    stats,
    unlockedKeys = []
) {
    const results = evaluateAllAchievementConditions(
        definitions,
        stats
    );

    const unlockedSet = new Set(unlockedKeys);

    return results.filter(result =>
        result.isEligible &&
        !unlockedSet.has(result.achievementKey)
    );
}
