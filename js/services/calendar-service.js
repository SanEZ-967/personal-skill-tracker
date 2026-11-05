
import { getAllPlannerActivities } from "./planner-service.js";

/**
 * Calendar view types.
 */
export const CALENDAR_VIEWS = {
    DAY: "day",
    WEEK: "week",
    MONTH: "month",
    AGENDA: "agenda"
};

/**
 * Format a Date as YYYY-MM-DD using local calendar values.
 */
export function formatCalendarDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error("A valid Date is required.");
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD as a local calendar date.
 */
export function parseCalendarDate(dateString) {
    if (
        typeof dateString !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
        throw new Error("Date must use YYYY-MM-DD format.");
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        throw new Error("Invalid calendar date.");
    }

    return date;
}

/**
 * Get today's date in local time.
 */
export function getTodayDate() {
    return formatCalendarDate(new Date());
}

/**
 * Get the first and last day of a month.
 */
export function getMonthRange(dateString) {
    const date = parseCalendarDate(dateString);

    const firstDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );

    const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
    );

    return {
        startDate: formatCalendarDate(firstDay),
        endDate: formatCalendarDate(lastDay)
    };
}

/**
 * Get Monday and Sunday of the selected week.
 */
export function getWeekRange(dateString) {
    const date = parseCalendarDate(dateString);

    const monday = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const dayOfWeek = monday.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    monday.setDate(monday.getDate() - daysSinceMonday);

    const sunday = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate()
    );

    sunday.setDate(sunday.getDate() + 6);

    return {
        startDate: formatCalendarDate(monday),
        endDate: formatCalendarDate(sunday)
    };
}

/**
 * Generate all dates needed for a month calendar grid.
 * The grid always starts on Monday and ends on Sunday.
 */
export function getMonthGrid(dateString) {
    const { startDate, endDate } = getMonthRange(dateString);

    const firstDay = parseCalendarDate(startDate);
    const lastDay = parseCalendarDate(endDate);

    const firstWeekday = (firstDay.getDay() + 6) % 7;
    firstDay.setDate(firstDay.getDate() - firstWeekday);

    const lastWeekday = (lastDay.getDay() + 6) % 7;
    lastDay.setDate(lastDay.getDate() + (6 - lastWeekday));

    const dates = [];
    const current = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        firstDay.getDate()
    );

    while (current <= lastDay) {
        dates.push(formatCalendarDate(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Move a date forward or backward by a selected calendar unit.
 */
export function navigateCalendarDate(dateString, direction, view) {
    if (!Number.isInteger(direction) || direction === 0) {
        throw new Error("Direction must be a non-zero integer.");
    }

    if (!Object.values(CALENDAR_VIEWS).includes(view)) {
        throw new Error("Invalid calendar view.");
    }

    const date = parseCalendarDate(dateString);

    switch (view) {
        case CALENDAR_VIEWS.DAY:
        case CALENDAR_VIEWS.AGENDA:
            date.setDate(date.getDate() + direction);
            break;

        case CALENDAR_VIEWS.WEEK:
            date.setDate(date.getDate() + direction * 7);
            break;

        case CALENDAR_VIEWS.MONTH: {
            const originalDay = date.getDate();
            date.setDate(1);
            date.setMonth(date.getMonth() + direction);

            const lastDay = new Date(
                date.getFullYear(),
                date.getMonth() + 1,
                0
            ).getDate();

            date.setDate(Math.min(originalDay, lastDay));
            break;
        }

        default:
            throw new Error("Unsupported calendar view.");
    }

    return formatCalendarDate(date);
}

/**
 * Filter activities within an inclusive date range.
 */
export function filterActivitiesByDateRange(
    activities,
    startDate,
    endDate
) {
    parseCalendarDate(startDate);
    parseCalendarDate(endDate);

    if (startDate > endDate) {
        throw new Error("Start date cannot be after end date.");
    }

    return activities
        .filter(activity =>
            activity.scheduledDate >= startDate &&
            activity.scheduledDate <= endDate
        )
        .sort((a, b) => {
            const dateComparison =
                a.scheduledDate.localeCompare(b.scheduledDate);

            if (dateComparison !== 0) {
                return dateComparison;
            }

            return a.startTime.localeCompare(b.startTime);
        });
}

/**
 * Group activities by scheduled date.
 */
export function groupActivitiesByDate(activities) {
    return activities.reduce((groups, activity) => {
        const date = activity.scheduledDate;

        if (!groups[date]) {
            groups[date] = [];
        }

        groups[date].push(activity);

        return groups;
    }, {});
}

/**
 * Load activities for a selected calendar date range.
 */
export async function getCalendarActivities(startDate, endDate) {
    const activities = await getAllPlannerActivities();

    return filterActivitiesByDateRange(
        activities,
        startDate,
        endDate
    );
}

/**
 * Get activities for a specific day.
 */
export async function getActivitiesForDay(dateString) {
    return getCalendarActivities(dateString, dateString);
}

/**
 * Get activities for a specific week.
 */
export async function getActivitiesForWeek(dateString) {
    const range = getWeekRange(dateString);

    return getCalendarActivities(
        range.startDate,
        range.endDate
    );
}

/**
 * Get activities for a specific month.
 */
export async function getActivitiesForMonth(dateString) {
    const range = getMonthRange(dateString);

    return getCalendarActivities(
        range.startDate,
        range.endDate
    );
}
