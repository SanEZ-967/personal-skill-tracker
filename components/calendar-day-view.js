
import { parseCalendarDate } from "../services/calendar-service.js";

const STATUS_LABELS = {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled"
};

function createActivityCard(activity, onActivityClick) {
    const card = document.createElement("article");
    card.className = "calendar-activity";
    card.classList.add(`calendar-activity--${activity.status}`);

    const time = document.createElement("span");
    time.className = "calendar-activity__time";
    time.textContent = activity.startTime;

    const details = document.createElement("div");
    details.className = "calendar-activity__details";

    const title = document.createElement("h3");
    title.className = "calendar-activity__title";
    title.textContent = activity.title;

    const duration = document.createElement("p");
    duration.className = "calendar-activity__duration";
    duration.textContent = `${activity.durationMinutes} minutes`;

    const status = document.createElement("span");
    status.className = "calendar-activity__status";
    status.textContent = STATUS_LABELS[activity.status] ?? activity.status;

    details.append(title, duration, status);

    card.append(time, details);

    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute(
        "aria-label",
        `${activity.title}, ${activity.startTime}, ${STATUS_LABELS[activity.status] ?? activity.status}`
    );

    card.addEventListener("click", () => {
        onActivityClick(activity);
    });

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivityClick(activity);
        }
    });

    return card;
}

/**
 * Create the daily Calendar view.
 *
 * onActivityClick receives the selected activity.
 */
export function createCalendarDayView({
    date,
    activities,
    onActivityClick = () => {}
}) {
    parseCalendarDate(date);

    if (!Array.isArray(activities)) {
        throw new Error("Activities must be an array.");
    }

    if (typeof onActivityClick !== "function") {
        throw new Error("onActivityClick must be a function.");
    }

    const container = document.createElement("section");
    container.className = "calendar-day-view";

    const heading = document.createElement("h2");
    heading.className = "calendar-day-view__heading";
    heading.textContent = parseCalendarDate(date).toLocaleDateString(
        undefined,
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

    container.appendChild(heading);

    const activityList = document.createElement("div");
    activityList.className = "calendar-day-view__activities";

    const sortedActivities = [...activities].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    if (sortedActivities.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "calendar-day-view__empty";
        emptyMessage.textContent = "No activities scheduled for this day.";

        activityList.appendChild(emptyMessage);
    } else {
        sortedActivities.forEach(activity => {
            activityList.appendChild(
                createActivityCard(activity, onActivityClick)
            );
        });
    }

    container.appendChild(activityList);

    return container;
}
