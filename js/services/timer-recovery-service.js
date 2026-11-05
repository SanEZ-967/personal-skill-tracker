
import { db } from "../database/db.js";

import {
    getTimerState
} from "./timer-service.js";

import {
    validateTimerState
} from "./timer-validation-service.js";

export async function recoverTimerSession() {
    const setting = await db.settings.get("activeTimer");

    if (!setting || !setting.value) {
        return {
            recovered: false,
            timer: null,
            reason: "No saved timer session exists."
        };
    }

    const timer = setting.value;

    try {
        validateTimerState(timer);
    } catch (error) {
        return {
            recovered: false,
            timer: null,
            reason: "Saved timer state is invalid.",
            error: error.message
        };
    }

    if (timer.status === "idle") {
        return {
            recovered: false,
            timer,
            reason: "No active session needs recovery."
        };
    }

    const restoredTimer = await getTimerState();

    let elapsedSeconds = restoredTimer.elapsedSeconds;

    if (restoredTimer.status === "running") {
        const resumedAt = Date.parse(
            restoredTimer.resumedAt
        );

        elapsedSeconds += Math.max(
            0,
            Math.floor(
                (Date.now() - resumedAt) / 1000
            )
        );
    }

    return {
        recovered: true,
        timer: restoredTimer,
        elapsedSeconds,
        status: restoredTimer.status,
        reason: "Timer session restored successfully."
    };
}
