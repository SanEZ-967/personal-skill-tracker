
import { db } from "../database/db.js";

import {
    validateGoalStatus,
    validateNodeReference
} from "./validation-service.js";

// ==========================================
// QUEST DIFFICULTY AND XP REWARDS
// ==========================================

export const QUEST_REWARDS = {
    EASY: 10,
    NORMAL: 25,
    HARD: 50,
    EPIC: 100
};

export const QUEST_DIFFICULTIES = [
    "easy",
    "normal",
    "hard",
    "epic"
];

function getTimestamp() {
    return new Date().toISOString();
}

// ==========================================
// VALIDATE GOAL INPUT
// ==========================================

function validateGoalInput({
    title,
    description = "",
    deadline = null
}) {
    if (typeof title !== "string" || !title.trim()) {
        throw new Error("Goal title is required.");
    }

    if (typeof description !== "string") {
        throw new Error("Goal description must be a string.");
    }

    if (deadline !== null) {
        if (
            typeof deadline !== "string" ||
            Number.isNaN(Date.parse(deadline))
        ) {
            throw new Error("Invalid goal deadline.");
        }
    }
}

// ==========================================
// CREATE GOAL
// ==========================================

export async function createGoal({
    nodeId = null,
    title,
    description = "",
    targetLevel = null,
    deadline = null
}) {
    validateGoalInput({
        title,
        description,
        deadline
    });

    if (nodeId !== null) {
        await validateNodeReference(nodeId);
    }

    if (targetLevel !== null) {
        if (
            !Number.isInteger(targetLevel) ||
            targetLevel < 0 ||
            targetLevel > 5
        ) {
            throw new Error("Target level must be between 0 and 5.");
        }
    }

    const timestamp = getTimestamp();

    const goal = {
        id: crypto.randomUUID(),
        nodeId,
        title: title.trim(),
        description,
        targetLevel,
        status: "active",
        deadline,
        createdAt: timestamp,
        completedAt: null
    };

    await db.goals.add(goal);

    return goal;
}

// ==========================================
// CREATE QUEST
// ==========================================


export async function createQuest({
    nodeId = null,
    title,
    description = "",
    difficulty = "normal",
    deadline = null,
    progressTarget = 1
}) {
    if (!QUEST_DIFFICULTIES.includes(difficulty)) {
        throw new Error("Invalid quest difficulty.");
    }

    if (
        !Number.isInteger(progressTarget) ||
        progressTarget < 1
    ) {
        throw new Error(
            "Quest progress target must be a positive integer."
        );
    }

    const quest = await createGoal({
        nodeId,
        title,
        description,
        deadline
    });

    await db.goals.update(quest.id, {
        questDifficulty: difficulty,
        progressCurrent: 0,
        progressTarget
    });

    return {
        ...quest,
        questDifficulty: difficulty,
        progressCurrent: 0,
        progressTarget,
        progressPercentage: 0,
        xpReward: QUEST_REWARDS[difficulty.toUpperCase()]
    };
}

// ==========================================
// READ GOALS AND QUESTS
// ==========================================

export async function getGoal(id) {
    return await db.goals.get(id);
}

export async function getAllGoals() {
    return await db.goals.toArray();
}

export async function getGoalsForNode(nodeId) {
    return await db.goals
        .where("nodeId")
        .equals(nodeId)
        .toArray();
}

export async function getActiveGoals() {
    return await db.goals
        .where("status")
        .equals("active")
        .toArray();
}

// ==========================================
// UPDATE GOAL
// ==========================================

export async function updateGoal(id, updates) {
    const existingGoal = await db.goals.get(id);

    if (!existingGoal) {
        throw new Error("Goal not found.");
    }

    if (
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates)
    ) {
        throw new Error("Updates must be an object.");
    }

    if (existingGoal.status === "completed") {
        throw new Error("Completed goals cannot be modified.");
    }

    const allowedFields = [
        "title",
        "description",
        "targetLevel",
        "deadline"
    ];

    const cleanUpdates = {};

    for (const field of allowedFields) {
        if (Object.hasOwn(updates, field)) {
            cleanUpdates[field] = updates[field];
        }
    }

    validateGoalInput({
        title: cleanUpdates.title ?? existingGoal.title,
        description: cleanUpdates.description ?? existingGoal.description,
        deadline: Object.hasOwn(cleanUpdates, "deadline")
            ? cleanUpdates.deadline
            : existingGoal.deadline
    });

    if (Object.hasOwn(cleanUpdates, "targetLevel")) {
        const level = cleanUpdates.targetLevel;

        if (
            level !== null &&
            (!Number.isInteger(level) || level < 0 || level > 5)
        ) {
            throw new Error("Target level must be between 0 and 5.");
        }
    }

    await db.goals.update(id, cleanUpdates);

    return await db.goals.get(id);
}

// ==========================================
// CHANGE GOAL STATUS
// ==========================================

export async function changeGoalStatus(id, status) {
    const goal = await db.goals.get(id);

    if (!goal) {
        throw new Error("Goal not found.");
    }

    validateGoalStatus(status);

    if (goal.status === "completed") {
        throw new Error("Completed goals cannot be changed.");
    }

    if (status === "completed") {
        throw new Error(
            "Use completeGoal() to complete a goal."
        );
    }

    await db.goals.update(id, {
        status
    });

    return await db.goals.get(id);
}

// ==========================================
// DELETE GOAL
// ==========================================

export async function deleteGoal(id) {
    const goal = await db.goals.get(id);

    if (!goal) {
        throw new Error("Goal not found.");
    }

    await db.goals.delete(id);

    return true;
}


// ==========================================
// COMPLETE GOAL OR QUEST
// ==========================================

export async function completeGoal(id) {
    return await db.transaction(
        "rw",
        db.goals,
        db.practiceLogs,
        async () => {
            const goal = await db.goals.get(id);

            if (!goal) {
                throw new Error("Goal not found.");
            }

            if (goal.status !== "active") {
                throw new Error(
                    "Only active goals can be completed."
                );
            }

            let xpAwarded = 0;

            // Determine whether this is a quest
            const isQuest = Object.hasOwn(
                goal,
                "questDifficulty"
            );


            if (isQuest) {
                const difficulty = goal.questDifficulty;

                if (!QUEST_DIFFICULTIES.includes(difficulty)) {
                    throw new Error(
                        "Quest has an invalid difficulty."
                    );
                }

                const currentProgress = goal.progressCurrent ?? 0;
                const targetProgress = goal.progressTarget ?? 1;

                if (currentProgress < targetProgress) {
                    throw new Error(
                        "Quest progress target has not been reached."
                    );
                }

                xpAwarded =
                    QUEST_REWARDS[difficulty.toUpperCase()];
            }


            const completedAt = getTimestamp();

            // Mark goal or quest as completed
            await db.goals.update(id, {
                status: "completed",
                completedAt
            });

            // Award XP only when completing a quest
            if (isQuest) {
                await db.practiceLogs.add({
                    id: crypto.randomUUID(),
                    nodeId: goal.nodeId,
                    activity: `Quest completed: ${goal.title}`,
                    durationMinutes: 0,
                    xpEarned: xpAwarded,
                    notes: `Quest difficulty: ${goal.questDifficulty}`,
                    practicedAt: completedAt,
                    questId: goal.id
                });
            }

            return {
                ...goal,
                status: "completed",
                completedAt,
                xpAwarded
            };
        }
    );
}


// ==========================================
// UPDATE QUEST PROGRESS
// ==========================================

export async function updateQuestProgress(id, progressAmount = 1) {
    if (
        !Number.isInteger(progressAmount) ||
        progressAmount < 1
    ) {
        throw new Error(
            "Progress amount must be a positive integer."
        );
    }

    const quest = await db.goals.get(id);

    if (!quest) {
        throw new Error("Quest not found.");
    }

    if (!Object.hasOwn(quest, "questDifficulty")) {
        throw new Error("This goal is not a quest.");
    }

    if (quest.status !== "active") {
        throw new Error("Only active quests can be updated.");
    }

    const currentProgress = quest.progressCurrent ?? 0;
    const targetProgress = quest.progressTarget ?? 1;

    const newProgress = Math.min(
        currentProgress + progressAmount,
        targetProgress
    );

    await db.goals.update(id, {
        progressCurrent: newProgress
    });

    return {
        ...quest,
        progressCurrent: newProgress,
        progressTarget: targetProgress,
        progressPercentage: Math.round(
            (newProgress / targetProgress) * 100
        ),
        isReadyToComplete: newProgress >= targetProgress
    };
}

// ==========================================
// GET QUEST PROGRESS
// ==========================================

export async function getQuestProgress(id) {
    const quest = await db.goals.get(id);

    if (!quest) {
        throw new Error("Quest not found.");
    }

    if (!Object.hasOwn(quest, "questDifficulty")) {
        throw new Error("This goal is not a quest.");
    }

    const currentProgress = quest.progressCurrent ?? 0;
    const targetProgress = quest.progressTarget ?? 1;

    return {
        questId: id,
        progressCurrent: currentProgress,
        progressTarget: targetProgress,
        progressPercentage: Math.round(
            (currentProgress / targetProgress) * 100
        ),
        isReadyToComplete: currentProgress >= targetProgress
    };
}
