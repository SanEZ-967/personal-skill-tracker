
import {
    parseCalendarDate,
    groupActivitiesByDate
} from "../services/calendar-service.js";

const STATUS_LABELS = {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled"
};

function createActivityCard(activity, onActivityClick) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "calendar-agenda-view__activity";
    card.classList.add(`calendar-activity--${activity.status}`);

    const time = document.createElement("span");
    time.className = "calendar-agenda-view__time";
    time.textContent = activity.startTime;

    const details = document.createElement("span");
    details.className = "calendar-agenda-view__details";

    const title = document.createElement("strong");
    title.className = "calendar-agenda-view__title";
    title.textContent = activity.title;

    const duration = document.createElement("span");
    duration.className = "calendar-agenda-view__duration";
    duration.textContent = `${activity.durationMinutes} minutes`;

    const status = document.createElement("span");
    status.className = "calendar-agenda-view__status";
    status.textContent =
        STATUS_LABELS[activity.status] ?? activity.status;

    details.append(title, duration, status);
    card.append(time, details);

    card.addEventListener("click", () => {
        onActivityClick(activity);
    });

    return card;
}

/**
 * Create the chronological Calendar agenda.
 *
 * onActivityClick receives the selected activity.
 */
export function createCalendarAgendaView({
    startDate,
    activities,
    onActivityClick = () => {},
    includeCancelled = true
}) {
    parseCalendarDate(startDate);

    if (!Array.isArray(activities)) {
        throw new Error("Activities must be an array.");
    }

    if (typeof onActivityClick !== "function") {
        throw new Error("onActivityClick must be a function.");
    }

    if (typeof includeCancelled !== "boolean") {
        throw new Error("includeCancelled must be a boolean.");
    }

    const container = document.createElement("section");
    container.className = "calendar-agenda-view";

    const heading = document.createElement("h2");
    heading.className = "calendar-agenda-view__heading";
    heading.textContent = "Activity Agenda";

    container.appendChild(heading);

    const filteredActivities = activities
        .filter(activity => activity.scheduledDate >= startDate)
        .filter(activity =>
            includeCancelled || activity.status !== "cancelled"
        )
        .sort((a, b) => {
            const dateComparison =
                a.scheduledDate.localeCompare(b.scheduledDate);

            if (dateComparison !== 0) {
                return dateComparison;
            }

            return a.startTime.localeCompare(b.startTime);
        });

    const groupedActivities = groupActivitiesByDate(
        filteredActivities
    );

    const dateGroups = Object.keys(groupedActivities).sort();

    if (dateGroups.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "calendar-agenda-view__empty";
        emptyMessage.textContent = "No upcoming activities.";

        container.appendChild(emptyMessage);

        return container;
    }

    dateGroups.forEach(dateString => {
        const dateSection = document.createElement("section");
        dateSection.className = "calendar-agenda-view__date-group";

        const dateHeading = document.createElement("h3");
        dateHeading.className = "calendar-agenda-view__date-heading";

        dateHeading.textContent = parseCalendarDate(
            dateString
        ).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        const activityList = document.createElement("div");
        activityList.className = "calendar-agenda-view__activities";

        groupedActivities[dateString].forEach(activity => {
            activityList.appendChild(
                createActivityCard(activity, onActivityClick)
            );
        });

        dateSection.append(dateHeading, activityList);
        container.appendChild(dateSection);
    });

    return container;
}
