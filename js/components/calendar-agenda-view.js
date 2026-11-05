
import { parseCalendarDate } from "../services/calendar-service.js";

function createElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;

    if (text) {
        element.textContent = text;
    }

    return element;
}

function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function formatDate(dateString) {
    const date = parseCalendarDate(dateString);

    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(date);
}

function createActivityCard(activity, onActivityClick) {
    const card = createElement(
        "button",
        `calendar-activity calendar-activity--${activity.status}`
    );

    card.type = "button";

    card.addEventListener("click", () => {
        onActivityClick(activity);
    });

    card.append(
        createElement(
            "span",
            "calendar-activity__title",
            activity.title
        ),
        createElement(
            "span",
            "calendar-activity__time",
            formatTime(activity.startTime)
        ),
        createElement(
            "span",
            "calendar-activity__duration",
            `${activity.durationMinutes} minutes`
        ),
        createElement(
            "span",
            "calendar-activity__status",
            activity.status.replace("_", " ")
        )
    );

    return card;
}

export function createCalendarAgendaView({
    startDate,
    activities,
    onActivityClick = () => {},
    includeCancelled = true
}) {
    const container = createElement(
        "div",
        "calendar-agenda-view"
    );

    const filteredActivities = activities
        .filter(activity =>
            activity.scheduledDate >= startDate &&
            (includeCancelled || activity.status !== "cancelled")
        )
        .sort((a, b) => {
            const dateComparison =
                a.scheduledDate.localeCompare(b.scheduledDate);

            return dateComparison !== 0
                ? dateComparison
                : a.startTime.localeCompare(b.startTime);
        });

    if (filteredActivities.length === 0) {
        container.appendChild(
            createElement(
                "p",
                "calendar-agenda-view__empty",
                "No upcoming activities scheduled."
            )
        );

        return container;
    }

    const groupedActivities = new Map();

    filteredActivities.forEach(activity => {
        if (!groupedActivities.has(activity.scheduledDate)) {
            groupedActivities.set(activity.scheduledDate, []);
        }

        groupedActivities
            .get(activity.scheduledDate)
            .push(activity);
    });

    groupedActivities.forEach((dayActivities, dateString) => {
        const daySection = createElement(
            "section",
            "calendar-agenda-view__day"
        );

        const heading = createElement(
            "h2",
            "calendar-agenda-view__date",
            formatDate(dateString)
        );

        const activityList = createElement(
            "div",
            "calendar-agenda-view__activities"
        );

        dayActivities.forEach(activity => {
            activityList.appendChild(
                createActivityCard(activity, onActivityClick)
            );
        });

        daySection.append(heading, activityList);
        container.appendChild(daySection);
    });

    return container;
}
