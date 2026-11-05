
import {
    getMonthGrid,
    parseCalendarDate
} from "../services/calendar-service.js";

const WEEKDAY_LABELS = [
    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
];

const STATUS_LABELS = {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled"
};

function createActivityIndicator(activity, onActivityClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-month-view__activity";
    button.classList.add(`calendar-activity--${activity.status}`);

    button.textContent = activity.title;

    button.title = `${activity.startTime} — ${activity.title} (${STATUS_LABELS[activity.status] ?? activity.status})`;

    button.addEventListener("click", event => {
        event.stopPropagation();
        onActivityClick(activity);
    });

    return button;
}

/**
 * Create the monthly Calendar view.
 *
 * onDateClick receives a YYYY-MM-DD date.
 * onActivityClick receives the selected activity.
 */
export function createCalendarMonthView({
    date,
    activities,
    onDateClick = () => {},
    onActivityClick = () => {}
}) {
    parseCalendarDate(date);

    if (!Array.isArray(activities)) {
        throw new Error("Activities must be an array.");
    }

    if (typeof onDateClick !== "function") {
        throw new Error("onDateClick must be a function.");
    }

    if (typeof onActivityClick !== "function") {
        throw new Error("onActivityClick must be a function.");
    }

    const container = document.createElement("section");
    container.className = "calendar-month-view";

    const grid = document.createElement("div");
    grid.className = "calendar-month-view__grid";

    WEEKDAY_LABELS.forEach(label => {
        const heading = document.createElement("div");
        heading.className = "calendar-month-view__weekday";
        heading.textContent = label;

        grid.appendChild(heading);
    });

    const dates = getMonthGrid(date);
    const selectedMonth = parseCalendarDate(date).getMonth();
    const today = new Date();

    const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    dates.forEach(dateString => {
        const currentDate = parseCalendarDate(dateString);

        const cell = document.createElement("div");
        cell.className = "calendar-month-view__day";

        if (currentDate.getMonth() !== selectedMonth) {
            cell.classList.add("is-outside-month");
        }

        if (dateString === todayString) {
            cell.classList.add("is-today");
        }

        const dayButton = document.createElement("button");
        dayButton.type = "button";
        dayButton.className = "calendar-month-view__day-button";
        dayButton.textContent = String(currentDate.getDate());

        dayButton.setAttribute(
            "aria-label",
            `Select ${currentDate.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            })}`
        );

        dayButton.addEventListener("click", () => {
            onDateClick(dateString);
        });

        const activityList = document.createElement("div");
        activityList.className = "calendar-month-view__activities";

        const dayActivities = activities
            .filter(activity => activity.scheduledDate === dateString)
            .sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
            );

        dayActivities.forEach(activity => {
            activityList.appendChild(
                createActivityIndicator(activity, onActivityClick)
            );
        });

        cell.append(dayButton, activityList);
        grid.appendChild(cell);
    });

    container.appendChild(grid);

    return container;
}
