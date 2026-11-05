
const TIMER_STATUSES = [
    "idle",
    "running",
    "paused"
];

export function validateTimerStatus(status) {
    if (!TIMER_STATUSES.includes(status)) {
        throw new Error("Invalid timer status.");
    }

    return true;
}

export function validateTimerDuration(seconds) {
    if (
        !Number.isInteger(seconds) ||
        seconds < 0
    ) {
        throw new Error(
            "Timer duration must be a non-negative whole number of seconds."
        );
    }

    return true;
}

export function validateTimerText(
    value,
    fieldName,
    maxLength = 1000
) {
    if (typeof value !== "string") {
        throw new Error(`${fieldName} must be a string.`);
    }

    if (value.length > maxLength) {
        throw new Error(
            `${fieldName} cannot exceed ${maxLength} characters.`
        );
    }

    return true;
}

export function validateTimerTimestamp(value, fieldName) {
    if (value === null) {
        return true;
    }

    if (
        typeof value !== "string" ||
        !Number.isFinite(Date.parse(value))
    ) {
        throw new Error(
            `${fieldName} must be a valid timestamp or null.`
        );
    }

    return true;
}

export function validateTimerReference(value, fieldName) {
    if (value === null) {
        return true;
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            `${fieldName} must be a valid reference or null.`
        );
    }

    return true;
}

export function validateTimerState(timer) {
    if (
        !timer ||
        typeof timer !== "object" ||
        Array.isArray(timer)
    ) {
        throw new Error("Invalid timer state.");
    }

    validateTimerStatus(timer.status);

    validateTimerReference(timer.nodeId, "nodeId");
    validateTimerReference(
        timer.plannerActivityId,
        "plannerActivityId"
    );

    // sessionId is optional for compatibility with older saved sessions.
    if (timer.sessionId !== undefined) {
        validateTimerReference(
            timer.sessionId,
            "sessionId"
        );
    }

    validateTimerText(timer.activity, "activity", 200);
    validateTimerText(timer.notes, "notes", 5000);

    validateTimerDuration(timer.elapsedSeconds);

    validateTimerTimestamp(timer.startedAt, "startedAt");
    validateTimerTimestamp(timer.resumedAt, "resumedAt");
    validateTimerTimestamp(timer.updatedAt, "updatedAt");

    if (timer.status === "idle") {
        if (
            timer.startedAt !== null ||
            timer.resumedAt !== null ||
            timer.elapsedSeconds !== 0 ||
            timer.nodeId !== null ||
            timer.plannerActivityId !== null ||
            (timer.sessionId !== undefined && timer.sessionId !== null)
        ) {
            throw new Error(
                "An idle timer cannot contain an active session."
            );
        }
    }

    if (timer.status === "running") {
        if (
            timer.startedAt === null ||
            timer.resumedAt === null
        ) {
            throw new Error(
                "A running timer must have valid start and resume timestamps."
            );
        }
    }

    if (timer.status === "paused") {
        if (
            timer.startedAt === null ||
            timer.resumedAt !== null
        ) {
            throw new Error(
                "A paused timer must have a start timestamp and no resume timestamp."
            );
        }
    }

    return true;
}

export function validateSavedTimerSession({
    nodeId,
    plannerActivityId,
    elapsedSeconds,
    activity,
    notes
}) {
    validateTimerReference(nodeId, "nodeId");

    validateTimerReference(
        plannerActivityId,
        "plannerActivityId"
    );

    validateTimerDuration(elapsedSeconds);

    if (elapsedSeconds < 300) {
        throw new Error(
            "A practice session must last at least 5 minutes before it can be saved."
        );
    }

    validateTimerText(activity, "activity", 200);

    if (!activity.trim()) {
        throw new Error(
            "A practice activity description is required."
        );
    }

    validateTimerText(notes, "notes", 5000);

    return true;
}
