
import { db } from "../database/db.js";

import {
    getXPReward
} from "./xp-service.js";

import {
    validateDuration
} from "./validation-service.js";

import {
    validateNodeReference
} from "./integrity-service.js";

import {
    validatePlannerActivity
} from "./planner-validation-service.js";

import {
    checkAchievementsSafely
} from "./achievement-check-service.js";

// ==========================================
// DETERMINE XP REWARD TYPE
// ==========================================

function getActivityTypeFromDuration(durationMinutes) {
    if (durationMinutes >= 5 && durationMinutes <= 15) {
        return "SHORT_PRACTICE";
    }

    if (durationMinutes <= 30) {
        return "STANDARD_PRACTICE";
    }

    if (durationMinutes <= 60) {
        return "FOCUSED_PRACTICE";
    }

    return "EXTENDED_PRACTICE";
}

// ==========================================
// COMPLETE PLANNER ACTIVITY
// ==========================================

export async function completePlannerActivity({
    id,
    actualDurationMinutes,
    notes = ""
}) {
    if (typeof id !== "string" || !id.trim()) {
        throw new Error("Planner activity ID is required.");
    }

    validateDuration(actualDurationMinutes);

    if (
        !Number.isInteger(actualDurationMinutes) ||
        actualDurationMinutes < 5
    ) {
        throw new Error(
            "Actual duration must be a whole number of at least 5 minutes."
        );
    }

    if (typeof notes !== "string") {
        throw new Error("Completion notes must be a string.");
    }

    let completedActivity;

    await db.transaction(
        "rw",
        db.plannerActivities,
        db.practiceLogs,
        db.nodes,
        async () => {
            const activity = await db.plannerActivities.get(id);

            if (!activity) {
                throw new Error("Planner activity not found.");
            }

            // Validate the existing activity record.
            validatePlannerActivity(activity);

            if (
                activity.status !== "planned" &&
                activity.status !== "in_progress"
            ) {
                throw new Error(
                    "Only planned or in-progress activities can be completed."
                );
            }

            if (activity.practiceLogId !== null) {
                throw new Error(
                    "This activity already has a linked practice log."
                );
            }

            // Verify the linked skill inside the transaction.
            if (activity.nodeId !== null) {
                await validateNodeReference(activity.nodeId);
            }

            const timestamp = new Date().toISOString();

            let practiceLogId = null;

            // Skill-linked activities generate practice logs and XP.
            if (activity.nodeId !== null) {
                const activityType = getActivityTypeFromDuration(
                    actualDurationMinutes
                );

                const xpEarned = getXPReward(activityType);

                practiceLogId = crypto.randomUUID();

                await db.practiceLogs.add({
                    id: practiceLogId,
                    nodeId: activity.nodeId,
                    activity: activity.title,
                    durationMinutes: actualDurationMinutes,
                    xpEarned,
                    notes: notes.trim(),
                    practicedAt: timestamp,
                    plannerActivityId: activity.id
                });
            }

            const updatedActivity = {
                ...activity,
                actualDurationMinutes,
                status: "completed",
                completedAt: timestamp,
                practiceLogId,
                notes: notes.trim()
                    ? notes.trim()
                    : activity.notes,
                updatedAt: timestamp
            };

            // Ensure the completed record satisfies lifecycle rules.
            validatePlannerActivity(updatedActivity);

            await db.plannerActivities.put(updatedActivity);

            completedActivity = updatedActivity;
        }
    );

    // Check achievements after the transaction succeeds.
    if (completedActivity.nodeId !== null) {
        await checkAchievementsSafely();
    }

    return {
        activity: completedActivity,
        practiceLogId: completedActivity.practiceLogId,
        xpAwarded: completedActivity.nodeId !== null
            ? getXPReward(
                getActivityTypeFromDuration(actualDurationMinutes)
            )
            : 0
    };
}
