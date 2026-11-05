
import {
    CALENDAR_VIEWS,
    getWeekRange,
    parseCalendarDate,
    navigateCalendarDate
} from "../services/calendar-service.js";

function createButton(label, className, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);

    return button;
}

function formatDate(dateString, options) {
    const date = parseCalendarDate(dateString);

    return new Intl.DateTimeFormat(undefined, options).format(date);
}

function getRangeLabel(dateString, view) {
    if (view === CALENDAR_VIEWS.DAY) {
        return formatDate(dateString, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (view === CALENDAR_VIEWS.WEEK) {
        const range = getWeekRange(dateString);

        return `${formatDate(range.startDate, {
            day: "numeric",
            month: "short"
        })} – ${formatDate(range.endDate, {
            day: "numeric",
            month: "short",
            year: "numeric"
        })}`;
    }

    if (view === CALENDAR_VIEWS.MONTH) {
        return formatDate(dateString, {
            month: "long",
            year: "numeric"
        });
    }

    return `Agenda from ${formatDate(dateString, {
        day: "numeric",
        month: "long",
        year: "numeric"
    })}`;
}

export function createCalendarHeader({
    currentDate,
    currentView,
    onDateChange,
    onViewChange
}) {
    const header = document.createElement("div");
    header.className = "calendar-header";

    const navigation = document.createElement("div");
    navigation.className = "calendar-header__navigation";

    const previousButton = createButton(
        "‹",
        "calendar-header__nav-button",
        () => {
            onDateChange(
                navigateCalendarDate(currentDate, -1, currentView)
            );
        }
    );

    previousButton.setAttribute("aria-label", "Previous period");

    const todayButton = createButton(
        "Today",
        "calendar-header__today-button",
        () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");

            onDateChange(`${year}-${month}-${day}`);
        }
    );

    const nextButton = createButton(
        "›",
        "calendar-header__nav-button",
        () => {
            onDateChange(
                navigateCalendarDate(currentDate, 1, currentView)
            );
        }
    );

    nextButton.setAttribute("aria-label", "Next period");

    const rangeLabel = document.createElement("h2");
    rangeLabel.className = "calendar-header__range";
    rangeLabel.textContent = getRangeLabel(currentDate, currentView);

    navigation.append(
        previousButton,
        todayButton,
        nextButton,
        rangeLabel
    );

    const viewControls = document.createElement("div");
    viewControls.className = "calendar-header__views";

    const views = [
        ["Day", CALENDAR_VIEWS.DAY],
        ["Week", CALENDAR_VIEWS.WEEK],
        ["Month", CALENDAR_VIEWS.MONTH],
        ["Agenda", CALENDAR_VIEWS.AGENDA]
    ];

    views.forEach(([label, view]) => {
        const button = createButton(
            label,
            "calendar-header__view-button",
            () => onViewChange(view)
        );

        if (currentView === view) {
            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.setAttribute("aria-pressed", "false");
        }

        viewControls.appendChild(button);
    });

    header.append(navigation, viewControls);

    return header;
}
