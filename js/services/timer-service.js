
import { db } from "../database/db.js";

import {
    validateTimerState,
    validateTimerText,
    validateTimerReference
} from "./timer-validation-service.js";

const TIMER_SETTING_KEY = "activeTimer";

function createIdleTimer() {
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
        updatedAt: new Date().toISOString()
    };
}

function getElapsedSeconds(timer, now = Date.now()) {
    let elapsed = timer.elapsedSeconds;

    if (timer.status === "running") {
        const resumedAt = Date.parse(timer.resumedAt);

        elapsed += Math.max(
            0,
            Math.floor((now - resumedAt) / 1000)
        );
    }

    return elapsed;
}

async function saveTimerState(timer) {
    const updatedTimer = {
        ...timer,
        updatedAt: new Date().toISOString()
    };

    validateTimerState(updatedTimer);

    await db.settings.put({
        key: TIMER_SETTING_KEY,
        value: updatedTimer,
        updatedAt: updatedTimer.updatedAt
    });

    return updatedTimer;
}

export async function getTimerState() {
    const setting = await db.settings.get(TIMER_SETTING_KEY);

    if (!setting || !setting.value) {
        return createIdleTimer();
    }

    validateTimerState(setting.value);

    return { ...setting.value };
}

export async function startTimer({
    nodeId = null,
    plannerActivityId = null,
    activity = "",
    notes = ""
} = {}) {
    const currentTimer = await getTimerState();

    if (currentTimer.status !== "idle") {
        throw new Error(
            "A timer session is already active. Reset it before starting another."
        );
    }

    validateTimerReference(nodeId, "nodeId");

    validateTimerReference(
        plannerActivityId,
        "plannerActivityId"
    );

    validateTimerText(activity, "activity", 200);
    validateTimerText(notes, "notes", 5000);

    let selectedNodeId = nodeId;
    let selectedActivity = activity.trim();

    if (plannerActivityId !== null) {
        const plannerActivity =
            await db.plannerActivities.get(plannerActivityId);

        if (!plannerActivity) {
            throw new Error(
                "The selected Planner activity could not be found."
            );
        }

        if (
            plannerActivity.status !== "planned" &&
            plannerActivity.status !== "in_progress"
        ) {
            throw new Error(
                "Only planned or in-progress activities can start a timer."
            );
        }

        if (plannerActivity.practiceLogId) {
            throw new Error(
                "This Planner activity already has a recorded practice session."
            );
        }

        if (
            nodeId !== null &&
            nodeId !== plannerActivity.nodeId
        ) {
            throw new Error(
                "The selected skill does not match the Planner activity."
            );
        }

        selectedNodeId = plannerActivity.nodeId ?? null;
        selectedActivity = plannerActivity.title;
    }

    if (selectedNodeId !== null) {
        const node = await db.nodes.get(selectedNodeId);

        if (!node) {
            throw new Error(
                "The selected skill could not be found."
            );
        }

        if (node.isArchived) {
            throw new Error(
                "An archived skill cannot be used for a new timer session."
            );
        }
    }

    if (!selectedActivity) {
        selectedActivity = "Practice session";
    }

    validateTimerText(
        selectedActivity,
        "activity",
        200
    );

    const now = new Date().toISOString();

    const timer = {
        status: "running",
        sessionId: crypto.randomUUID(),
        nodeId: selectedNodeId,
        plannerActivityId,
        activity: selectedActivity,
        notes,
        startedAt: now,
        resumedAt: now,
        elapsedSeconds: 0,
        updatedAt: now
    };

    return saveTimerState(timer);
}

export async function pauseTimer() {
    const timer = await getTimerState();

    if (timer.status !== "running") {
        throw new Error(
            "Only a running timer can be paused."
        );
    }

    const now = Date.now();

    const updatedTimer = {
        ...timer,
        status: "paused",
        elapsedSeconds: getElapsedSeconds(timer, now),
        resumedAt: null
    };

    return saveTimerState(updatedTimer);
}

export async function resumeTimer() {
    const timer = await getTimerState();

    if (timer.status !== "paused") {
        throw new Error(
            "Only a paused timer can be resumed."
        );
    }

    const updatedTimer = {
        ...timer,
        status: "running",
        resumedAt: new Date().toISOString()
    };

    return saveTimerState(updatedTimer);
}

export async function resetTimer() {
    const timer = await getTimerState();

    if (timer.status === "idle") {
        return timer;
    }

    return saveTimerState(createIdleTimer());
}

export async function getElapsedTimerSeconds() {
    const timer = await getTimerState();

    return getElapsedSeconds(timer);
}

export async function getTimerDisplay() {
    const totalSeconds = await getElapsedTimerSeconds();

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );
    const seconds = totalSeconds % 60;

    return {
        totalSeconds,
        hours,
        minutes,
        seconds,
        formatted: [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(seconds).padStart(2, "0")
        ].join(":")
    };
}

export async function updateTimerDetails({
    activity,
    notes
} = {}) {
    const timer = await getTimerState();

    if (timer.status === "idle") {
        throw new Error(
            "Start a timer before updating its details."
        );
    }

    const updatedTimer = { ...timer };

    if (activity !== undefined) {
        validateTimerText(activity, "activity", 200);
        updatedTimer.activity = activity.trim();
    }

    if (notes !== undefined) {
        validateTimerText(notes, "notes", 5000);
        updatedTimer.notes = notes;
    }

    return saveTimerState(updatedTimer);
}
