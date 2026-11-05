
import { db } from "../database/db.js";

import {
    getTimerState
} from "./timer-service.js";

import {
    validateSavedTimerSession
} from "./timer-validation-service.js";

import {
    getXPReward
} from "./xp-service.js";

import {
    validateNodeReference
} from "./integrity-service.js";

import {
    checkAchievementsSafely
} from "./achievement-check-service.js";

import {
    completePlannerActivity
} from "./planner-completion-service.js";

function getActivityType(durationMinutes) {
    if (durationMinutes <= 15) {
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

function createIdleTimer() {
    const now = new Date().toISOString();

    return {
        status: "idle",
        sessionId: null,
        nodeId: null,
        plannerActivityId: null,
        activity: "",
        notes: "",
        startedAt: null,
        resumedAt: null,
        elapsedSeconds: 0,
        updatedAt: now
    };
}

function getSessionIdentifier(timer) {
    // Older saved sessions do not contain sessionId.
    return timer.sessionId ?? timer.startedAt;
}

async function saveStandaloneTimerSession({
    timer,
    sessionId,
    durationMinutes,
    activity,
    notes,
    xpEarned
}) {
    return db.transaction(
        "rw",
        db.practiceLogs,
        db.settings,
        db.plannerActivities,
        async () => {
            const timerSetting = await db.settings.get("activeTimer");
            const activeTimer = timerSetting?.value;

            if (
                !activeTimer ||
                activeTimer.status === "idle" ||
                getSessionIdentifier(activeTimer) !== sessionId
            ) {
                throw new Error(
                    "The timer session changed before it could be saved. Please refresh and check your practice history."
                );
            }

            const existingLog = await db.practiceLogs
                .filter(log => log.timerSessionId === sessionId)
                .first();

            if (existingLog) {
                if (timer.plannerActivityId !== null) {
                    const plannerActivity = await db.plannerActivities.get(
                        timer.plannerActivityId
                    );

                    if (plannerActivity) {
                        await db.plannerActivities.update(
                            plannerActivity.id,
                            {
                                status: "completed",
                                actualDurationMinutes: durationMinutes,
                                completedAt: new Date().toISOString(),
                                practiceLogId: existingLog.id,
                                updatedAt: new Date().toISOString()
                            }
                        );
                    }
                }

                await db.settings.put({
                    key: "activeTimer",
                    value: createIdleTimer(),
                    updatedAt: new Date().toISOString()
                });

                return {
                    practiceLog: existingLog,
                    alreadyRecorded: true
                };
            }

            const practiceLog = {
                id: crypto.randomUUID(),
                nodeId: timer.nodeId,
                activity: activity.trim(),
                durationMinutes,
                xpEarned,
                notes,
                timerSessionId: sessionId,
                plannerActivityId: timer.plannerActivityId,
                practicedAt: new Date().toISOString()
            };

            await db.practiceLogs.add(practiceLog);

            if (timer.plannerActivityId !== null) {
                const plannerActivity = await db.plannerActivities.get(
                    timer.plannerActivityId
                );

                if (
                    !plannerActivity ||
                    (
                        plannerActivity.status !== "planned" &&
                        plannerActivity.status !== "in_progress"
                    ) ||
                    plannerActivity.practiceLogId
                ) {
                    throw new Error(
                        "The linked Planner activity is no longer available for completion."
                    );
                }

                await db.plannerActivities.update(
                    plannerActivity.id,
                    {
                        status: "completed",
                        actualDurationMinutes: durationMinutes,
                        completedAt: new Date().toISOString(),
                        practiceLogId: practiceLog.id,
                        updatedAt: new Date().toISOString()
                    }
                );
            }

            await db.settings.put({
                key: "activeTimer",
                value: createIdleTimer(),
                updatedAt: new Date().toISOString()
            });

            return {
                practiceLog,
                alreadyRecorded: false
            };
        }
    );
}

export async function completeTimerSession({
    actualDurationMinutes = null,
    activity = undefined,
    notes = undefined
} = {}) {
    const timer = await getTimerState();

    if (timer.status === "idle") {
        throw new Error(
            "There is no active timer session to complete."
        );
    }

    const elapsedSeconds = timer.status === "running"
        ? timer.elapsedSeconds + Math.max(
            0,
            Math.floor(
                (Date.now() - Date.parse(timer.resumedAt)) / 1000
            )
        )
        : timer.elapsedSeconds;

    const durationMinutes = actualDurationMinutes === null
        ? Math.floor(elapsedSeconds / 60)
        : actualDurationMinutes;

    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 5
    ) {
        throw new Error(
            "A completed practice session must be at least 5 minutes long."
        );
    }

    const sessionActivity = activity === undefined
        ? timer.activity
        : activity;

    const sessionNotes = notes === undefined
        ? timer.notes
        : notes;

    validateSavedTimerSession({
        nodeId: timer.nodeId,
        plannerActivityId: timer.plannerActivityId,
        elapsedSeconds: durationMinutes * 60,
        activity: sessionActivity,
        notes: sessionNotes
    });

    if (timer.nodeId !== null) {
        await validateNodeReference(timer.nodeId);
    }

    const sessionId = getSessionIdentifier(timer);
    const activityType = getActivityType(durationMinutes);
    const xpEarned = getXPReward(activityType);

    const result = await saveStandaloneTimerSession({
        timer,
        sessionId,
        durationMinutes,
        activity: sessionActivity,
        notes: sessionNotes,
        xpEarned
    });

    if (!result.alreadyRecorded) {
        await checkAchievementsSafely();
    }

    return {
        timerSessionCompleted: true,
        practiceLog: result.practiceLog,
        practiceLogId: result.practiceLog.id,
        xpEarned: result.practiceLog.xpEarned,
        durationMinutes: result.practiceLog.durationMinutes,
        alreadyRecorded: result.alreadyRecorded
    };
}
