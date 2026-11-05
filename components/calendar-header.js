
import {
    CALENDAR_VIEWS,
    getMonthRange,
    getWeekRange,
    parseCalendarDate,
    navigateCalendarDate
} from "../services/calendar-service.js";

const VIEW_LABELS = {
    [CALENDAR_VIEWS.DAY]: "Day",
    [CALENDAR_VIEWS.WEEK]: "Week",
    [CALENDAR_VIEWS.MONTH]: "Month",
    [CALENDAR_VIEWS.AGENDA]: "Agenda"
};

function formatDisplayDate(dateString, options = {}) {
    return parseCalendarDate(dateString).toLocaleDateString(
        undefined,
        options
    );
}

function getDateRangeLabel(currentDate, currentView) {
    if (currentView === CALENDAR_VIEWS.DAY) {
        return formatDisplayDate(currentDate, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (currentView === CALENDAR_VIEWS.WEEK) {
        const range = getWeekRange(currentDate);
        const start = parseCalendarDate(range.startDate);
        const end = parseCalendarDate(range.endDate);

        if (start.getFullYear() === end.getFullYear()) {
            return `${start.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short"
            })} – ${end.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric"
            })}`;
        }

        return `${formatDisplayDate(range.startDate, {
            day: "numeric",
            month: "short",
            year: "numeric"
        })} – ${formatDisplayDate(range.endDate, {
            day: "numeric",
            month: "short",
            year: "numeric"
        })}`;
    }

    if (currentView === CALENDAR_VIEWS.MONTH) {
        const date = parseCalendarDate(currentDate);

        return date.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });
    }

    return `From ${formatDisplayDate(currentDate, {
        day: "numeric",
        month: "long",
        year: "numeric"
    })}`;
}

/**
 * Create the Calendar header.
 *
 * onDateChange receives the new YYYY-MM-DD date.
 * onViewChange receives the selected view name.
 */
export function createCalendarHeader({
    currentDate,
    currentView,
    onDateChange,
    onViewChange
}) {
    if (!parseCalendarDate(currentDate)) {
        throw new Error("A valid current date is required.");
    }

    if (!Object.values(CALENDAR_VIEWS).includes(currentView)) {
        throw new Error("A valid calendar view is required.");
    }

    if (typeof onDateChange !== "function") {
        throw new Error("onDateChange must be a function.");
    }

    if (typeof onViewChange !== "function") {
        throw new Error("onViewChange must be a function.");
    }

    const header = document.createElement("section");
    header.className = "calendar-header";

    const navigation = document.createElement("div");
    navigation.className = "calendar-header__navigation";

    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.className = "calendar-header__nav-button";
    previousButton.textContent = "←";
    previousButton.setAttribute("aria-label", "Previous period");

    const todayButton = document.createElement("button");
    todayButton.type = "button";
    todayButton.className = "calendar-header__today-button";
    todayButton.textContent = "Today";

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "calendar-header__nav-button";
    nextButton.textContent = "→";
    nextButton.setAttribute("aria-label", "Next period");

    const dateLabel = document.createElement("h2");
    dateLabel.className = "calendar-header__date-label";
    dateLabel.textContent = getDateRangeLabel(
        currentDate,
        currentView
    );

    previousButton.addEventListener("click", () => {
        onDateChange(
            navigateCalendarDate(
                currentDate,
                -1,
                currentView
            )
        );
    });

    todayButton.addEventListener("click", () => {
        const today = new Date();

        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");

        onDateChange(todayString);
    });

    nextButton.addEventListener("click", () => {
        onDateChange(
            navigateCalendarDate(
                currentDate,
                1,
                currentView
            )
        );
    });

    navigation.append(
        previousButton,
        todayButton,
        nextButton,
        dateLabel
    );

    const viewSelector = document.createElement("div");
    viewSelector.className = "calendar-header__views";
    viewSelector.setAttribute("role", "group");
    viewSelector.setAttribute("aria-label", "Calendar view");

    Object.entries(VIEW_LABELS).forEach(([view, label]) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "calendar-header__view-button";
        button.textContent = label;

        if (view === currentView) {
            button.classList.add("is-active");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.setAttribute("aria-pressed", "false");
        }

        button.addEventListener("click", () => {
            onViewChange(view);
        });

        viewSelector.appendChild(button);
    });

    header.append(navigation, viewSelector);

    return header;
}
