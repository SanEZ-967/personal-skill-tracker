
import { db } from "../database/db.js";

import {
    validateNodeReference
} from "./integrity-service.js";

import {
    validatePlannerActivity,
    validatePlannerTitle,
    validatePlannerDate,
    validatePlannerTime,
    validatePlannerDuration,
    validatePlannerStatus,
    validateRecurrence,
    validateOptionalReference,
    validateOptionalString
} from "./planner-validation-service.js";

function getTimestamp() {
    return new Date().toISOString();
}

// ==========================================
// VALIDATE ACTIVITY REFERENCES
// ==========================================

async function validateActivityReferences(activity) {
    if (activity.nodeId !== null) {
        await validateNodeReference(activity.nodeId);
    }

    if (activity.goalId !== null) {
        const goal = await db.goals.get(activity.goalId);

        if (!goal) {
            throw new Error("Referenced goal does not exist.");
        }
    }
}

// ==========================================
// CREATE ACTIVITY
// ==========================================

export async function createPlannerActivity({
    title,
    description = "",
    nodeId = null,
    goalId = null,
    scheduledDate,
    startTime,
    durationMinutes,
    recurrence = null,
    notes = ""
}) {
    validatePlannerTitle(title);
    validateOptionalString(description, "Description");
    validateOptionalString(notes, "Notes");

    validateOptionalReference(nodeId, "Node ID");
    validateOptionalReference(goalId, "Goal ID");

    validatePlannerDate(scheduledDate);
    validatePlannerTime(startTime);
    validatePlannerDuration(durationMinutes);
    validateRecurrence(recurrence, scheduledDate);

    const activity = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description,
        nodeId,
        goalId,
        scheduledDate,
        startTime,
        durationMinutes,
        actualDurationMinutes: null,
        status: "planned",
        recurrence,
        notes,
        completedAt: null,
        practiceLogId: null,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp()
    };

    validatePlannerActivity(activity);

    await db.transaction(
        "rw",
        db.plannerActivities,
        db.nodes,
        db.goals,
        async () => {
            await validateActivityReferences(activity);
            await db.plannerActivities.add(activity);
        }
    );

    return activity;
}

// ==========================================
// READ ACTIVITIES
// ==========================================

export async function getPlannerActivity(id) {
    return await db.plannerActivities.get(id);
}

export async function getAllPlannerActivities() {
    return await db.plannerActivities
        .orderBy("scheduledDate")
        .toArray();
}

export async function getActivitiesByDate(date) {
    validatePlannerDate(date);

    return await db.plannerActivities
        .where("scheduledDate")
        .equals(date)
        .sortBy("startTime");
}

export async function getActivitiesByStatus(status) {
    validatePlannerStatus(status);

    return await db.plannerActivities
        .where("status")
        .equals(status)
        .sortBy("scheduledDate");
}

export async function getActivitiesByNode(nodeId) {
    validateOptionalReference(nodeId, "Node ID");

    return await db.plannerActivities
        .where("nodeId")
        .equals(nodeId)
        .sortBy("scheduledDate");
}

export async function getActivitiesByGoal(goalId) {
    validateOptionalReference(goalId, "Goal ID");

    return await db.plannerActivities
        .where("goalId")
        .equals(goalId)
        .sortBy("scheduledDate");
}

// ==========================================
// UPDATE ACTIVITY
// ==========================================

export async function updatePlannerActivity(id, updates) {
    if (
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates)
    ) {
        throw new Error("Updates must be an object.");
    }

    const allowedFields = [
        "title",
        "description",
        "nodeId",
        "goalId",
        "scheduledDate",
        "startTime",
        "durationMinutes",
        "recurrence",
        "notes"
    ];

    const cleanUpdates = {};

    for (const field of allowedFields) {
        if (Object.hasOwn(updates, field)) {
            cleanUpdates[field] = updates[field];
        }
    }

    return await db.transaction(
        "rw",
        db.plannerActivities,
        db.nodes,
        db.goals,
        async () => {
            const existingActivity =
                await db.plannerActivities.get(id);

            if (!existingActivity) {
                throw new Error("Planner activity not found.");
            }

            if (
                existingActivity.status === "completed" ||
                existingActivity.status === "cancelled"
            ) {
                throw new Error(
                    "Completed or cancelled activities cannot be edited."
                );
            }

            const updatedActivity = {
                ...existingActivity,
                ...cleanUpdates,
                updatedAt: getTimestamp()
            };

            await validateActivityReferences(updatedActivity);
            validatePlannerActivity(updatedActivity);

            await db.plannerActivities.put(updatedActivity);

            return updatedActivity;
        }
    );
}

// ==========================================
// CHANGE ACTIVITY STATUS
// ==========================================

export async function updatePlannerActivityStatus(id, status) {
    validatePlannerStatus(status);

    if (status === "completed") {
        throw new Error(
            "Use completePlannerActivity() to complete an activity."
        );
    }

    return await db.transaction(
        "rw",
        db.plannerActivities,
        async () => {
            const activity = await db.plannerActivities.get(id);

            if (!activity) {
                throw new Error("Planner activity not found.");
            }

            if (activity.status === "completed") {
                throw new Error(
                    "Completed activities cannot change status."
                );
            }

            if (activity.status === "cancelled") {
                throw new Error(
                    "Cancelled activities cannot change status."
                );
            }

            if (
                activity.status === "missed" &&
                status !== "cancelled"
            ) {
                throw new Error(
                    "Missed activities cannot be restarted."
                );
            }

            if (
                activity.status === "in_progress" &&
                status === "planned"
            ) {
                throw new Error(
                    "An in-progress activity cannot return to planned status."
                );
            }

            const updatedActivity = {
                ...activity,
                status,
                updatedAt: getTimestamp()
            };

            validatePlannerActivity(updatedActivity);

            await db.plannerActivities.put(updatedActivity);

            return updatedActivity;
        }
    );
}

// ==========================================
// DELETE ACTIVITY
// ==========================================

export async function deletePlannerActivity(id) {
    return await db.transaction(
        "rw",
        db.plannerActivities,
        async () => {
            const activity = await db.plannerActivities.get(id);

            if (!activity) {
                throw new Error("Planner activity not found.");
            }

            if (
                activity.status === "completed" ||
                activity.practiceLogId !== null
            ) {
                throw new Error(
                    "Activities with practice history cannot be deleted."
                );
            }

            await db.plannerActivities.delete(id);

            return true;
        }
    );
}

// ==========================================
// UPCOMING ACTIVITIES
// ==========================================

export async function getUpcomingActivities(fromDate) {
    validatePlannerDate(fromDate);

    return await db.plannerActivities
        .where("scheduledDate")
        .aboveOrEqual(fromDate)
        .filter(activity =>
            activity.status === "planned" ||
            activity.status === "in_progress"
        )
        .sortBy("scheduledDate");
}
