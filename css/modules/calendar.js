
import {
    CALENDAR_VIEWS,
    getTodayDate,
    getMonthGrid,
    getCalendarActivities,
    getActivitiesForDay,
    getActivitiesForWeek
} from "../services/calendar-service.js";

import { getAllPlannerActivities } from "../services/planner-service.js";

import { createCalendarHeader } from "../components/calendar-header.js";
import { createCalendarDayView } from "../components/calendar-day-view.js";
import { createCalendarWeekView } from "../components/calendar-week-view.js";
import { createCalendarMonthView } from "../components/calendar-month-view.js";
import { createCalendarAgendaView } from "../components/calendar-agenda-view.js";

function createElement(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
}

export function mountCalendar(
    container,
    {
        onActivitySelect = () => {},
        onCreateActivity = () => {}
    } = {}
) {
    if (!(container instanceof HTMLElement)) {
        throw new Error("A valid HTML container is required.");
    }

    if (typeof onActivitySelect !== "function") {
        throw new Error("onActivitySelect must be a function.");
    }

    if (typeof onCreateActivity !== "function") {
        throw new Error("onCreateActivity must be a function.");
    }

    let currentDate = getTodayDate();
    let currentView = CALENDAR_VIEWS.MONTH;
    let renderVersion = 0;

    const root = createElement("div", "calendar-module");
    const headerContainer = createElement("div", "calendar-module__header");
    const contentContainer = createElement("div", "calendar-module__content");
    const actionsContainer = createElement("div", "calendar-module__actions");

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "calendar-module__create-button";
    createButton.textContent = "Create Activity";

    createButton.addEventListener("click", () => {
        onCreateActivity(currentDate);
    });

    actionsContainer.appendChild(createButton);
    root.append(headerContainer, actionsContainer, contentContainer);
    container.replaceChildren(root);

    async function loadActivities() {
        if (currentView === CALENDAR_VIEWS.DAY) {
            return getActivitiesForDay(currentDate);
        }

        if (currentView === CALENDAR_VIEWS.WEEK) {
            return getActivitiesForWeek(currentDate);
        }

        if (currentView === CALENDAR_VIEWS.MONTH) {
            const dates = getMonthGrid(currentDate);

            return getCalendarActivities(
                dates[0],
                dates[dates.length - 1]
            );
        }

        return (await getAllPlannerActivities())
            .filter(activity =>
                activity.scheduledDate >= currentDate &&
                activity.status !== "cancelled"
            )
            .sort((a, b) => {
                const dateComparison =
                    a.scheduledDate.localeCompare(b.scheduledDate);

                return dateComparison !== 0
                    ? dateComparison
                    : a.startTime.localeCompare(b.startTime);
            });
    }

    function renderHeader() {
        headerContainer.replaceChildren(
            createCalendarHeader({
                currentDate,
                currentView,
                onDateChange: date => {
                    currentDate = date;
                    render();
                },
                onViewChange: view => {
                    currentView = view;
                    render();
                }
            })
        );
    }

    function renderView(activities) {
        if (currentView === CALENDAR_VIEWS.DAY) {
            return createCalendarDayView({
                date: currentDate,
                activities,
                onActivityClick: onActivitySelect
            });
        }

        if (currentView === CALENDAR_VIEWS.WEEK) {
            return createCalendarWeekView({
                date: currentDate,
                activities,
                onDateClick: date => {
                    currentDate = date;
                    currentView = CALENDAR_VIEWS.DAY;
                    render();
                },
                onActivityClick: onActivitySelect
            });
        }

        if (currentView === CALENDAR_VIEWS.MONTH) {
            return createCalendarMonthView({
                date: currentDate,
                activities,
                onDateClick: date => {
                    currentDate = date;
                    currentView = CALENDAR_VIEWS.DAY;
                    render();
                },
                onActivityClick: onActivitySelect
            });
        }

        return createCalendarAgendaView({
            startDate: currentDate,
            activities,
            onActivityClick: onActivitySelect,
            includeCancelled: false
        });
    }

    async function render() {
        const currentRender = ++renderVersion;

        renderHeader();

        const loadingMessage = createElement(
            "p",
            "calendar-module__loading"
        );

        loadingMessage.textContent = "Loading calendar...";
        contentContainer.replaceChildren(loadingMessage);

        try {
            const activities = await loadActivities();

            if (currentRender !== renderVersion) {
                return;
            }

            contentContainer.replaceChildren(
                renderView(activities)
            );
        } catch (error) {
            if (currentRender !== renderVersion) {
                return;
            }

            console.error("Calendar loading failed:", error);

            const errorMessage = createElement(
                "p",
                "calendar-module__error"
            );

            errorMessage.textContent =
                "Unable to load calendar activities. Please try again.";

            const retryButton = document.createElement("button");
            retryButton.type = "button";
            retryButton.textContent = "Retry";
            retryButton.addEventListener("click", render);

            contentContainer.replaceChildren(
                errorMessage,
                retryButton
            );
        }
    }

    render();

    return {
        refresh: render,

        setDate(date) {
            currentDate = date;
            return render();
        },

        setView(view) {
            if (!Object.values(CALENDAR_VIEWS).includes(view)) {
                throw new Error("Invalid calendar view.");
            }

            currentView = view;
            return render();
        },

        getState() {
            return {
                currentDate,
                currentView
            };
        },

        destroy() {
            renderVersion += 1;
            container.replaceChildren();
        }
    };
}
