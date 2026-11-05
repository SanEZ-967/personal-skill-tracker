
import {
    getWeekRange,
    parseCalendarDate,
    formatCalendarDate
} from "../services/calendar-service.js";

const STATUS_LABELS = {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled"
};

function createActivityItem(activity, onActivityClick) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "calendar-week-view__activity";
    item.classList.add(`calendar-activity--${activity.status}`);

    const time = document.createElement("span");
    time.className = "calendar-week-view__activity-time";
    time.textContent = activity.startTime;

    const title = document.createElement("span");
    title.className = "calendar-week-view__activity-title";
    title.textContent = activity.title;

    const status = document.createElement("span");
    status.className = "calendar-week-view__activity-status";
    status.textContent =
        STATUS_LABELS[activity.status] ?? activity.status;

    item.append(time, title, status);

    item.addEventListener("click", () => {
        onActivityClick(activity);
    });

    return item;
}

/**
 * Create the seven-day Calendar week view.
 *
 * onDateClick receives a YYYY-MM-DD date.
 * onActivityClick receives the selected activity.
 */
export function createCalendarWeekView({
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
    container.className = "calendar-week-view";

    const range = getWeekRange(date);
    const startDate = parseCalendarDate(range.startDate);

    const grid = document.createElement("div");
    grid.className = "calendar-week-view__grid";

    const today = formatCalendarDate(new Date());

    for (let index = 0; index < 7; index += 1) {
        const currentDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
        );

        currentDate.setDate(currentDate.getDate() + index);

        const dateString = formatCalendarDate(currentDate);

        const dayColumn = document.createElement("div");
        dayColumn.className = "calendar-week-view__day";

        if (dateString === today) {
            dayColumn.classList.add("is-today");
        }

        const dayHeader = document.createElement("button");
        dayHeader.type = "button";
        dayHeader.className = "calendar-week-view__day-header";

        const weekday = document.createElement("span");
        weekday.className = "calendar-week-view__weekday";
        weekday.textContent = currentDate.toLocaleDateString(
            undefined,
            { weekday: "short" }
        );

        const dayNumber = document.createElement("span");
        dayNumber.className = "calendar-week-view__day-number";
        dayNumber.textContent = String(currentDate.getDate());

        dayHeader.append(weekday, dayNumber);

        dayHeader.addEventListener("click", () => {
            onDateClick(dateString);
        });

        const dayActivities = activities
            .filter(activity => activity.scheduledDate === dateString)
            .sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
            );

        const activityList = document.createElement("div");
        activityList.className = "calendar-week-view__activities";

        if (dayActivities.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "calendar-week-view__empty";
            emptyMessage.textContent = "No activities";

            activityList.appendChild(emptyMessage);
        } else {
            dayActivities.forEach(activity => {
                activityList.appendChild(
                    createActivityItem(activity, onActivityClick)
                );
            });
        }

        dayColumn.append(dayHeader, activityList);
        grid.appendChild(dayColumn);
    }

    container.appendChild(grid);

    return container;
}
