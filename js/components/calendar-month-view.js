
import {
    getMonthGrid,
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

export function createCalendarMonthView({
    date,
    activities,
    onDateClick = () => {},
    onActivityClick = () => {}
}) {
    const container = createElement(
        "div",
        "calendar-month-view"
    );

    const grid = createElement(
        "div",
        "calendar-month-view__grid"
    );

    const weekdayNames = [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"
    ];

    weekdayNames.forEach(day => {
        grid.appendChild(
            createElement(
                "div",
                "calendar-month-view__weekday",
                day
            )
        );
    });

    const dates = getMonthGrid(date);
    const today = getTodayDate();
    const currentMonth = date.slice(0, 7);

    dates.forEach(dateString => {
        const parsedDate = parseCalendarDate(dateString);

        const dayActivities = activities
            .filter(activity => activity.scheduledDate === dateString)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const cell = createElement(
            "section",
            "calendar-month-view__day"
        );

        if (dateString === today) {
            cell.classList.add("is-today");
        }

        if (dateString.slice(0, 7) !== currentMonth) {
            cell.classList.add("is-outside-month");
        }

        const dateButton = createElement(
            "button",
            "calendar-month-view__date",
            String(parsedDate.getDate())
        );

        dateButton.type = "button";
        dateButton.addEventListener("click", () => {
            onDateClick(dateString);
        });

        cell.appendChild(dateButton);

        const activityList = createElement(
            "div",
            "calendar-month-view__activities"
        );

        const visibleActivities = dayActivities.slice(0, 3);

        visibleActivities.forEach(activity => {
            const button = createElement(
                "button",
                `calendar-month-view__activity calendar-activity--${activity.status}`,
                activity.title
            );

            button.type = "button";
            button.title = activity.title;

            button.addEventListener("click", event => {
                event.stopPropagation();
                onActivityClick(activity);
            });

            activityList.appendChild(button);
        });

        if (dayActivities.length > 3) {
            activityList.appendChild(
                createElement(
                    "span",
                    "calendar-month-view__more",
                    `+${dayActivities.length - 3} more`
                )
            );
        }

        cell.appendChild(activityList);
        grid.appendChild(cell);
    });

    container.appendChild(grid);

    return container;
}
