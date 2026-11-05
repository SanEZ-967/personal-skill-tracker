
export function createTimerControls({
    status = "idle",
    onStart = () => {},
    onPause = () => {},
    onResume = () => {},
    onReset = () => {}
} = {}) {
    const container = document.createElement("div");

    container.className = "timer-controls";

    function createButton(label, className, onClick) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;

        button.addEventListener("click", onClick);

        return button;
    }

    if (status === "idle") {
        container.append(
            createButton(
                "Start",
                "timer-button timer-button--primary",
                onStart
            )
        );
    }

    if (status === "running") {
        container.append(
            createButton(
                "Pause",
                "timer-button timer-button--primary",
                onPause
            )
        );
    }

    if (status === "paused") {
        container.append(
            createButton(
                "Resume",
                "timer-button timer-button--primary",
                onResume
            )
        );
    }

    if (status !== "idle") {
        container.append(
            createButton(
                "Reset",
                "timer-button timer-button--secondary",
                onReset
            )
        );
    }

    return container;
}
