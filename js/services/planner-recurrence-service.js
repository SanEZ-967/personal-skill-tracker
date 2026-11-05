
import { db } from "../database/db.js";

import {
    validatePlannerDate,
    validatePlannerTime,
    validatePlannerDuration,
    validatePlannerActivity,
    validateRecurrence
} from "./planner-validation-service.js";

function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(0);

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    return date;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function addMonths(date, months, preferredDay) {
    const firstOfMonth = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + months,
        1
    ));

    const lastDay = new Date(Date.UTC(
        firstOfMonth.getUTCFullYear(),
        firstOfMonth.getUTCMonth() + 1,
        0
    )).getUTCDate();

    return new Date(Date.UTC(
        firstOfMonth.getUTCFullYear(),
        firstOfMonth.getUTCMonth(),
        Math.min(preferredDay, lastDay)
    ));
}

// ==========================================
// CALCULATE OCCURRENCE DATES
// ==========================================

function getOccurrenceDates(
    scheduledDate,
    recurrence,
    untilDate,
    maxOccurrences
) {
    const dates = [];
    const startDate = parseDate(scheduledDate);
    const endDate = parseDate(untilDate);

    const recurrenceEnd = recurrence.endDate
        ? parseDate(recurrence.endDate)
        : endDate;

    const effectiveEnd = recurrenceEnd < endDate
        ? recurrenceEnd
        : endDate;

    if (startDate > effectiveEnd) {
        return dates;
    }

    if (recurrence.type === "daily") {
        for (
            let date = new Date(startDate);
            date <= effectiveEnd && dates.length < maxOccurrences;
            date = addDays(date, recurrence.interval)
        ) {
            dates.push(formatDate(date));
        }
    }

    if (recurrence.type === "weekly") {
        const weekStart = addDays(
            startDate,
            -startDate.getUTCDay()
        );

        const weekdays = [...recurrence.weekdays].sort(
            (a, b) => a - b
        );

        for (
            let date = new Date(startDate);
            date <= effectiveEnd && dates.length < maxOccurrences;
            date = addDays(date, 1)
        ) {
            const weekIndex = Math.floor(
                (date.getTime() - weekStart.getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            );

            const isScheduledWeek =
                weekIndex % recurrence.interval === 0;

            if (
                isScheduledWeek &&
                weekdays.includes(date.getUTCDay())
            ) {
                dates.push(formatDate(date));
            }
        }
    }

    if (recurrence.type === "monthly") {
        for (
            let monthOffset = 0;
            dates.length < maxOccurrences;
            monthOffset += recurrence.interval
        ) {
            const occurrence = addMonths(
                startDate,
                monthOffset,
                recurrence.dayOfMonth
            );

            if (occurrence > effectiveEnd) {
                break;
            }

            if (occurrence >= startDate) {
                dates.push(formatDate(occurrence));
            }
        }
    }

    return dates;
}

// ==========================================
// GENERATE RECURRING ACTIVITIES
// ==========================================

export async function generateRecurringActivities({
    sourceActivityId,
    untilDate,
    maxOccurrences = 100
}) {
    if (
        typeof sourceActivityId !== "string" ||
        !sourceActivityId.trim()
    ) {
        throw new Error("Source activity ID is required.");
    }

    validatePlannerDate(untilDate);

    if (
        !Number.isInteger(maxOccurrences) ||
        maxOccurrences < 1 ||
        maxOccurrences > 1000
    ) {
        throw new Error(
            "Maximum occurrences must be an integer between 1 and 1000."
        );
    }

    return await db.transaction(
        "rw",
        db.plannerActivities,
        async () => {
            const sourceActivity =
                await db.plannerActivities.get(sourceActivityId);

            if (!sourceActivity) {
                throw new Error("Source planner activity not found.");
            }

            if (sourceActivity.status !== "planned") {
                throw new Error(
                    "Only planned activities can generate recurring activities."
                );
            }

            if (!sourceActivity.recurrence) {
                throw new Error(
                    "This activity does not have a recurrence configuration."
                );
            }

            validatePlannerTime(sourceActivity.startTime);
            validatePlannerDuration(sourceActivity.durationMinutes);

            validateRecurrence(
                sourceActivity.recurrence,
                sourceActivity.scheduledDate
            );

            const occurrenceDates = getOccurrenceDates(
                sourceActivity.scheduledDate,
                sourceActivity.recurrence,
                untilDate,
                maxOccurrences
            );

            const existingActivities = await db.plannerActivities
                .where("scheduledDate")
                .anyOf(occurrenceDates)
                .toArray();

            const existingKeys = new Set(
                existingActivities
                    .filter(activity =>
                        activity.recurrenceSourceId === sourceActivityId
                    )
                    .map(activity => activity.scheduledDate)
            );

            const timestamp = new Date().toISOString();
            const newActivities = [];

            for (const scheduledDate of occurrenceDates) {
                if (
                    scheduledDate === sourceActivity.scheduledDate ||
                    existingKeys.has(scheduledDate)
                ) {
                    continue;
                }

                const activity = {
                    id: crypto.randomUUID(),
                    recurrenceSourceId: sourceActivityId,
                    title: sourceActivity.title,
                    description: sourceActivity.description,
                    nodeId: sourceActivity.nodeId,
                    goalId: sourceActivity.goalId,
                    scheduledDate,
                    startTime: sourceActivity.startTime,
                    durationMinutes: sourceActivity.durationMinutes,
                    actualDurationMinutes: null,
                    status: "planned",
                    recurrence: null,
                    notes: sourceActivity.notes,
                    completedAt: null,
                    practiceLogId: null,
                    createdAt: timestamp,
                    updatedAt: timestamp
                };

                validatePlannerActivity(activity);
                newActivities.push(activity);
            }

            if (newActivities.length > 0) {
                await db.plannerActivities.bulkAdd(newActivities);
            }

            return {
                generatedCount: newActivities.length,
                activities: newActivities
            };
        }
    );
}
