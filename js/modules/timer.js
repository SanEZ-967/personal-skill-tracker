
import { db } from "../database/db.js";

import {
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    getTimerState,
    getElapsedTimerSeconds
} from "../services/timer-service.js";

import {
    recoverTimerSession
} from "../services/timer-recovery-service.js";

import {
    completeTimerSession
} from "../services/timer-completion-service.js";

import {
    createTimerDisplay
} from "../components/timer-display.js";

import {
    createTimerControls
} from "../components/timer-controls.js";

function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text) {
        element.textContent = text;
    }

    return element;
}

function createField(labelText, control) {
    const wrapper = createElement("div", "timer-field");
    const label = createElement("label", "", labelText);

    label.htmlFor = control.id;

    wrapper.append(label, control);

    return wrapper;
}

function createSelect(id, placeholder) {
    const select = document.createElement("select");
    select.id = id;

    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;

    select.append(option);

    return select;
}

export function mountTimer(container) {
    if (!container) {
        throw new Error("Timer container was not provided.");
    }

    let timerState = null;
    let intervalId = null;
    let destroyed = false;

    container.replaceChildren();

    const root = createElement("section", "timer-container");
    const card = createElement("div", "timer-card");

    const heading = createElement("div", "timer-heading");

    heading.append(
        createElement("h2", "", "Practice Timer"),
        createElement(
            "p",
            "",
            "Track your focused practice sessions."
        )
    );

    const displayContainer = createElement(
        "div",
        "timer-display-container"
    );

    const controlsContainer = createElement(
        "div",
        "timer-controls-container"
    );

    const details = createElement("div", "timer-details");

    const activityInput = document.createElement("input");
    activityInput.id = "timer-activity";
    activityInput.type = "text";
    activityInput.maxLength = 200;
    activityInput.placeholder = "e.g. JavaScript practice";

    const skillSelect = createSelect(
        "timer-skill",
        "No skill selected (standalone practice)"
    );

    const plannerSelect = createSelect(
        "timer-planner",
        "No Planner activity selected"
    );

    const notesInput = document.createElement("textarea");
    notesInput.id = "timer-notes";
    notesInput.maxLength = 5000;
    notesInput.placeholder = "Optional practice notes";

    details.append(
        createField("Activity", activityInput),
        createField("Skill or competency (optional)", skillSelect),
        createField("Planner activity (optional)", plannerSelect),
        createField("Notes (optional)", notesInput)
    );

    const message = createElement("div", "timer-message");
    message.setAttribute("role", "status");
    message.hidden = true;

    const completionContainer = createElement(
        "div",
        "timer-completion"
    );

    card.append(
        heading,
        displayContainer,
        details,
        controlsContainer,
        completionContainer,
        message
    );

    root.append(card);
    container.append(root);

    // ======================================
    // MANUAL DURATION INPUT
    // ======================================

    const manualDurationInput = document.createElement("input");

    manualDurationInput.id = "timer-manual-duration";
    manualDurationInput.type = "number";
    manualDurationInput.min = "5";
    manualDurationInput.step = "1";
    manualDurationInput.placeholder =
        "Leave blank to use timer duration";

    function showMessage(text, isError = false) {
        message.textContent = text;
        message.hidden = false;

        message.classList.toggle(
            "timer-message--error",
            isError
        );
    }

    function clearMessage() {
        message.textContent = "";
        message.hidden = true;

        message.classList.remove("timer-message--error");
    }

    // ======================================
    // LOAD SKILLS AND PLANNER ACTIVITIES
    // ======================================

    async function loadOptions() {
        const [nodes, activities] = await Promise.all([
            db.nodes.toArray(),
            db.plannerActivities.toArray()
        ]);

        const availableNodes = nodes
            .filter(node =>
                !node.isArchived &&
                (
                    node.nodeType === "skill" ||
                    node.nodeType === "competency"
                )
            )
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );

        for (const node of availableNodes) {
            const option = document.createElement("option");

            option.value = node.id;
            option.textContent = node.name;

            skillSelect.append(option);
        }

        // Include both skill-linked and standalone activities.
        const availableActivities = activities
            .filter(activity =>
                activity.status === "planned" ||
                activity.status === "in_progress"
            )
            .sort((a, b) =>
                a.scheduledDate.localeCompare(b.scheduledDate)
            );

        for (const activity of availableActivities) {
            const option = document.createElement("option");

            option.value = activity.id;

            option.textContent =
                `${activity.title} (${activity.scheduledDate})`;

            plannerSelect.append(option);
        }
    }

    // ======================================
    // FORM STATE
    // ======================================

    function updateFormState() {
        const isIdle = timerState?.status === "idle";

        activityInput.disabled = !isIdle;
        skillSelect.disabled = !isIdle;
        plannerSelect.disabled = !isIdle;
        notesInput.disabled = !isIdle;

        if (timerState && !isIdle) {
            activityInput.value = timerState.activity;

            skillSelect.value = timerState.nodeId ?? "";

            plannerSelect.value =
                timerState.plannerActivityId ?? "";

            notesInput.value = timerState.notes;
        }
    }

    // ======================================
    // RENDER CONTROLS
    // ======================================

    function renderControls() {
        controlsContainer.replaceChildren();

        const controls = createTimerControls({
            status: timerState.status,

            onStart: handleStart,
            onPause: handlePause,
            onResume: handleResume,
            onReset: handleReset
        });

        controlsContainer.append(controls);

        completionContainer.replaceChildren();

        if (timerState.status !== "idle") {
            const durationField = createField(
                "Actual practice duration in minutes (optional)",
                manualDurationInput
            );

            const durationHint = createElement(
                "p",
                "",
                "Leave blank to use the measured timer duration. Enter at least 5 minutes if you want to override it."
            );

            durationHint.className = "timer-completion__hint";

            const saveButton = createElement(
                "button",
                "timer-button timer-button--primary",
                "Complete and Save Session"
            );

            saveButton.type = "button";

            saveButton.addEventListener(
                "click",
                handleComplete
            );

            completionContainer.append(
                durationField,
                durationHint,
                saveButton
            );
        }

        updateFormState();
    }

    // ======================================
    // RENDER TIMER DISPLAY
    // ======================================

    async function renderDisplay() {
        if (!timerState) {
            return;
        }

        const elapsedSeconds = await getElapsedTimerSeconds();

        if (destroyed) {
            return;
        }

        const hours = Math.floor(elapsedSeconds / 3600);

        const minutes = Math.floor(
            (elapsedSeconds % 3600) / 60
        );

        const seconds = elapsedSeconds % 60;

        const formatted = [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(seconds).padStart(2, "0")
        ].join(":");

        displayContainer.replaceChildren(
            createTimerDisplay({
                formatted,
                status: timerState.status
            })
        );
    }

    function startDisplayUpdates() {
        stopDisplayUpdates();

        intervalId = setInterval(() => {
            renderDisplay().catch(error => {
                showMessage(error.message, true);
            });
        }, 1000);
    }

    function stopDisplayUpdates() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    // ======================================
    // REFRESH
    // ======================================

    async function refresh() {
        timerState = await getTimerState();

        if (destroyed) {
            return;
        }

        await renderDisplay();

        renderControls();

        if (timerState.status === "running") {
            startDisplayUpdates();
        } else {
            stopDisplayUpdates();
        }
    }

    // ======================================
    // START TIMER
    // ======================================

    async function handleStart() {
        try {
            clearMessage();

            const plannerActivityId =
                plannerSelect.value || null;

            let nodeId = skillSelect.value || null;

            if (plannerActivityId !== null) {
                const plannerActivity =
                    await db.plannerActivities.get(
                        plannerActivityId
                    );

                if (!plannerActivity) {
                    throw new Error(
                        "The selected Planner activity no longer exists."
                    );
                }

                nodeId = plannerActivity.nodeId ?? null;
            }

            await startTimer({
                nodeId,
                plannerActivityId,
                activity: activityInput.value.trim() ||
                    "Practice session",
                notes: notesInput.value
            });

            manualDurationInput.value = "";

            await refresh();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // PAUSE TIMER
    // ======================================

    async function handlePause() {
        try {
            clearMessage();

            await pauseTimer();
            await refresh();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // RESUME TIMER
    // ======================================

    async function handleResume() {
        try {
            clearMessage();

            await resumeTimer();
            await refresh();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // RESET TIMER
    // ======================================

    async function handleReset() {
        if (!window.confirm(
            "Reset this timer? The unsaved session will be discarded."
        )) {
            return;
        }

        try {
            clearMessage();

            await resetTimer();

            activityInput.value = "";
            skillSelect.value = "";
            plannerSelect.value = "";
            notesInput.value = "";
            manualDurationInput.value = "";

            await refresh();

            showMessage(
                "Timer reset. No XP was awarded."
            );
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // COMPLETE AND SAVE SESSION
    // ======================================

    async function handleComplete() {
        try {
            clearMessage();

            const manualValue = manualDurationInput.value.trim();

            const actualDurationMinutes = manualValue === ""
                ? null
                : Number(manualValue);

            const result = await completeTimerSession({
                actualDurationMinutes
            });

            activityInput.value = "";
            skillSelect.value = "";
            plannerSelect.value = "";
            notesInput.value = "";
            manualDurationInput.value = "";

            await refresh();

            showMessage(
                `Session saved! Duration: ${result.durationMinutes} minutes. XP earned: ${result.xpEarned}.`
            );
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // INITIALIZE AND RECOVER SESSION
    // ======================================

    async function initialize() {
        try {
            await loadOptions();

            const recovery = await recoverTimerSession();

            timerState = await getTimerState();

            if (recovery.recovered) {
                showMessage(
                    "Your previous timer session was restored."
                );
            }

            await refresh();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // ======================================
    // PLANNER SELECTION
    // ======================================

    plannerSelect.addEventListener("change", () => {
        if (!plannerSelect.value) {
            return;
        }

        db.plannerActivities
            .get(plannerSelect.value)
            .then(activity => {
                if (activity) {
                    skillSelect.value = activity.nodeId ?? "";
                    activityInput.value = activity.title;
                }
            })
            .catch(error => {
                showMessage(error.message, true);
            });
    });

    initialize();

    // ======================================
    // PUBLIC MODULE API
    // ======================================

    return {
        refresh,

        getState() {
            return timerState ? { ...timerState } : null;
        },

        destroy() {
            destroyed = true;

            stopDisplayUpdates();

            container.replaceChildren();
        }
    };
}
