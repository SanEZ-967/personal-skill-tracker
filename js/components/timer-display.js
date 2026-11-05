
export function createTimerDisplay({
    formatted = "00:00:00",
    status = "idle"
} = {}) {
    const container = document.createElement("div");

    container.className = "timer-display";
    container.setAttribute("role", "timer");
    container.setAttribute("aria-live", "off");

    const time = document.createElement("div");
    time.className = "timer-display__time";
    time.textContent = formatted;

    const statusLabel = document.createElement("div");
    statusLabel.className = "timer-display__status";

    const statusLabels = {
        idle: "Ready to practice",
        running: "Timer running",
        paused: "Timer paused"
    };

    statusLabel.textContent =
        statusLabels[status] ?? "Unknown status";

    container.append(time, statusLabel);

    return container;
}
