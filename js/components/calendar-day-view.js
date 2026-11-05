
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

function createActivityCard(activity, onActivityClick) {
    const card = createElement(
        "button",
        `calendar-activity calendar-activity--${activity.status}`
    );

    card.type = "button";
    card.addEventListener("click", () => {
        onActivityClick(activity);
    });

    const title = createElement(
        "span",
        "calendar-activity__title",
        activity.title
    );

    const time = createElement(
        "span",
        "calendar-activity__time",
        formatTime(activity.startTime)
    );

    const duration = createElement(
        "span",
        "calendar-activity__duration",
        `${activity.durationMinutes} minutes`
    );

    const status = createElement(
        "span",
        "calendar-activity__status",
        activity.status.replace("_", " ")
    );

    card.append(title, time, duration, status);

    return card;
}

export function createCalendarDayView({
    date,
    activities,
    onActivityClick = () => {}
}) {
    const container = createElement(
        "div",
        "calendar-day-view"
    );

    const parsedDate = parseCalendarDate(date);

    const heading = createElement(
        "h2",
        "calendar-day-view__heading",
        new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(parsedDate)
    );

    container.appendChild(heading);

    const activityList = createElement(
        "div",
        "calendar-day-view__activities"
    );

    const sortedActivities = [...activities].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    if (sortedActivities.length === 0) {
        const emptyMessage = createElement(
            "p",
            "calendar-day-view__empty",
            "No activities scheduled for this day."
        );

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
