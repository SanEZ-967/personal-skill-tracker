
import {
    getWeekRange,
    parseCalendarDate,
    getTodayDate
} from "../services/calendar-service.js";

function createElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;

    if (text) {
        element.textContent = text;
    }

    return element;
}

function addDays(dateString, amount) {
    const date = parseCalendarDate(dateString);
    date.setDate(date.getDate() + amount);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

export function createCalendarWeekView({
    date,
    activities,
    onDateClick = () => {},
    onActivityClick = () => {}
}) {
    const container = createElement(
        "div",
        "calendar-week-view"
    );

    const range = getWeekRange(date);
    const today = getTodayDate();

    const grid = createElement(
        "div",
        "calendar-week-view__grid"
    );

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dateString = addDays(range.startDate, dayIndex);
        const parsedDate = parseCalendarDate(dateString);

        const dayActivities = activities
            .filter(activity => activity.scheduledDate === dateString)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const column = createElement(
            "section",
            "calendar-week-view__day"
        );

        if (dateString === today) {
            column.classList.add("is-today");
        }

        const dayButton = createElement(
            "button",
            "calendar-week-view__day-header"
        );

        dayButton.type = "button";
        dayButton.addEventListener("click", () => {
            onDateClick(dateString);
        });

        const dayName = createElement(
            "span",
            "calendar-week-view__day-name",
            new Intl.DateTimeFormat(undefined, {
                weekday: "short"
            }).format(parsedDate)
        );

        const dayNumber = createElement(
            "span",
            "calendar-week-view__day-number",
            String(parsedDate.getDate())
        );

        dayButton.append(dayName, dayNumber);
        column.appendChild(dayButton);

        const activityList = createElement(
            "div",
            "calendar-week-view__activities"
        );

        if (dayActivities.length === 0) {
            activityList.appendChild(
                createElement(
                    "p",
                    "calendar-week-view__empty",
                    "No activities"
                )
            );
        } else {
            dayActivities.forEach(activity => {
                const button = createElement(
                    "button",
                    `calendar-week-view__activity calendar-activity--${activity.status}`,
                    activity.title
                );

                button.type = "button";
                button.title =
                    `${formatTime(activity.startTime)} — ${activity.title}`;

                button.addEventListener("click", () => {
                    onActivityClick(activity);
                });

                activityList.appendChild(button);
            });
        }

        column.appendChild(activityList);
        grid.appendChild(column);
    }

    container.appendChild(grid);

    return container;
}
