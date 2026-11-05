
export const PLANNER_ACTIVITY_STATUSES = [
    "planned",
    "in_progress",
    "completed",
    "missed",
    "cancelled"
];

export const PLANNER_RECURRENCE_TYPES = [
    "daily",
    "weekly",
    "monthly"
];

// ==========================================
// BASIC VALIDATORS
// ==========================================

export function validatePlannerTitle(title) {
    if (typeof title !== "string" || !title.trim()) {
        throw new Error("Activity title is required.");
    }

    return true;
}

export function validatePlannerDate(date) {
    if (typeof date !== "string") {
        throw new Error("Scheduled date must be a string.");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
        throw new Error("Date must use YYYY-MM-DD format.");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsedDate = new Date(0);
    parsedDate.setUTCHours(0, 0, 0, 0);
    parsedDate.setUTCFullYear(year, month - 1, day);

    if (
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day
    ) {
        throw new Error("Scheduled date is invalid.");
    }

    return true;
}

export function validatePlannerTime(time) {
    if (
        typeof time !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
        throw new Error("Start time must use HH:MM format.");
    }

    return true;
}

export function validatePlannerDuration(duration, fieldName = "Duration") {
    if (!Number.isInteger(duration) || duration <= 0) {
        throw new Error(`${fieldName} must be a positive integer.`);
    }

    return true;
}

export function validatePlannerStatus(status) {
    if (!PLANNER_ACTIVITY_STATUSES.includes(status)) {
        throw new Error("Invalid planner activity status.");
    }

    return true;
}

// ==========================================
// OPTIONAL FIELD VALIDATORS
// ==========================================

export function validateOptionalString(value, fieldName) {
    if (value !== null && typeof value !== "string") {
        throw new Error(`${fieldName} must be a string or null.`);
    }

    return true;
}

export function validateOptionalReference(value, fieldName) {
    if (value !== null) {
        if (typeof value !== "string" || !value.trim()) {
            throw new Error(`${fieldName} must be a valid ID or null.`);
        }
    }

    return true;
}

export function validateOptionalDuration(duration) {
    if (duration !== null) {
        validatePlannerDuration(duration, "Actual duration");
    }

    return true;
}

export function validateOptionalTimestamp(timestamp, fieldName) {
    if (timestamp === null) {
        return true;
    }

    if (
        typeof timestamp !== "string" ||
        !Number.isFinite(Date.parse(timestamp))
    ) {
        throw new Error(
            `${fieldName} must be a valid ISO timestamp or null.`
        );
    }

    return true;
}

// ==========================================
// RECURRENCE VALIDATION
// ==========================================

export function validateRecurrence(recurrence, scheduledDate) {
    if (recurrence === null) {
        return true;
    }

    if (
        !recurrence ||
        typeof recurrence !== "object" ||
        Array.isArray(recurrence)
    ) {
        throw new Error("Recurrence must be an object or null.");
    }

    const {
        type,
        interval,
        weekdays,
        dayOfMonth,
        endDate
    } = recurrence;

    if (!PLANNER_RECURRENCE_TYPES.includes(type)) {
        throw new Error("Invalid recurrence type.");
    }

    if (!Number.isInteger(interval) || interval <= 0) {
        throw new Error(
            "Recurrence interval must be a positive integer."
        );
    }

    if (type === "weekly") {
        if (!Array.isArray(weekdays) || weekdays.length === 0) {
            throw new Error(
                "Weekly recurrence requires at least one weekday."
            );
        }

        if (
            weekdays.some(day =>
                !Number.isInteger(day) || day < 0 || day > 6
            )
        ) {
            throw new Error("Weekdays must be integers from 0 to 6.");
        }

        if (new Set(weekdays).size !== weekdays.length) {
            throw new Error("Weekdays cannot contain duplicates.");
        }
    }

    if (type === "monthly") {
        if (
            !Number.isInteger(dayOfMonth) ||
            dayOfMonth < 1 ||
            dayOfMonth > 31
        ) {
            throw new Error(
                "Monthly recurrence day must be between 1 and 31."
            );
        }
    }

    if (endDate !== null && endDate !== undefined) {
        validatePlannerDate(endDate);

        if (endDate < scheduledDate) {
            throw new Error(
                "Recurrence end date cannot precede the scheduled date."
            );
        }
    }

    return true;
}

// ==========================================
// COMPLETE ACTIVITY VALIDATION
// ==========================================

export function validatePlannerActivity(activity) {
    if (
        !activity ||
        typeof activity !== "object" ||
        Array.isArray(activity)
    ) {
        throw new Error("Planner activity must be an object.");
    }

    const {
        id,
        title,
        description,
        nodeId,
        goalId,
        scheduledDate,
        startTime,
        durationMinutes,
        actualDurationMinutes,
        status,
        recurrence,
        notes,
        completedAt,
        practiceLogId,
        createdAt,
        updatedAt
    } = activity;

    // Required identity and content
    if (typeof id !== "string" || !id.trim()) {
        throw new Error("Planner activity ID is required.");
    }

    validatePlannerTitle(title);
    validateOptionalString(description, "Description");

    // References
    validateOptionalReference(nodeId, "Node ID");
    validateOptionalReference(goalId, "Goal ID");
    validateOptionalReference(practiceLogId, "Practice log ID");

    // Scheduling
    validatePlannerDate(scheduledDate);
    validatePlannerTime(startTime);
    validatePlannerDuration(durationMinutes);

    // Completion data
    validateOptionalDuration(actualDurationMinutes);
    validatePlannerStatus(status);
    validateOptionalTimestamp(completedAt, "Completion timestamp");

    // Recurrence and notes
    validateRecurrence(recurrence, scheduledDate);
    validateOptionalString(notes, "Notes");

    // Record timestamps
    validateOptionalTimestamp(createdAt, "Creation timestamp");
    validateOptionalTimestamp(updatedAt, "Update timestamp");

    if (createdAt === null || updatedAt === null) {
        throw new Error(
            "Creation and update timestamps are required."
        );
    }

    // Completion lifecycle integrity
    if (status === "completed") {
        if (
            actualDurationMinutes === null ||
            actualDurationMinutes === undefined ||
            actualDurationMinutes < 5
        ) {
            throw new Error(
                "Completed activities must have an actual duration of at least 5 minutes."
            );
        }

        if (completedAt === null || completedAt === undefined) {
            throw new Error(
                "Completed activities must have a completion timestamp."
            );
        }

        if (nodeId !== null && !practiceLogId) {
            throw new Error(
                "Completed activities linked to a skill must have a practice log."
            );
        }

        if (nodeId === null && practiceLogId !== null) {
            throw new Error(
                "Standalone activities cannot have a practice log."
            );
        }
    } else {
        if (
            actualDurationMinutes !== null ||
            completedAt !== null ||
            practiceLogId !== null
        ) {
            throw new Error(
                "Uncompleted activities cannot contain completion data."
            );
        }
    }

    return true;
}
