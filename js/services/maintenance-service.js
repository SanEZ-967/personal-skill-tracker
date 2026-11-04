
import { db } from "../database/db.js";
getMaintenancePriority,
getMaintenanceRecommendation,
getMaintenanceSummary

// ==========================================
// MAINTENANCE STATUS RULES
// ==========================================

export const MAINTENANCE_STATUSES = [
    {
        status: "fresh",
        label: "Fresh",
        minDays: 0,
        maxDays: 7
    },
    {
        status: "maintained",
        label: "Maintained",
        minDays: 8,
        maxDays: 30
    },
    {
        status: "needs_attention",
        label: "Needs attention",
        minDays: 31,
        maxDays: 60
    },
    {
        status: "at_risk",
        label: "At risk",
        minDays: 61,
        maxDays: 90
    },
    {
        status: "overdue",
        label: "Overdue",
        minDays: 91,
        maxDays: Infinity
    }
];

// ==========================================
// CALCULATE DAYS SINCE PRACTICE
// ==========================================

export function calculateDaysSincePractice(lastPracticedAt) {
    if (!lastPracticedAt) {
        return null;
    }

    const practiceDate = new Date(lastPracticedAt);

    if (Number.isNaN(practiceDate.getTime())) {
        throw new Error("Invalid practice date.");
    }

    const now = new Date();

    if (practiceDate > now) {
        throw new Error("Practice date cannot be in the future.");
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.floor(
        (now.getTime() - practiceDate.getTime()) /
        millisecondsPerDay
    );
}

// ==========================================
// GET MAINTENANCE STATUS
// ==========================================

export function getMaintenanceStatus(daysSincePractice) {
    if (
        !Number.isInteger(daysSincePractice) ||
        daysSincePractice < 0
    ) {
        throw new Error("Invalid days since practice.");
    }

    const result = MAINTENANCE_STATUSES.find(
        item =>
            daysSincePractice >= item.minDays &&
            daysSincePractice <= item.maxDays
    );

    return result;
}

// ==========================================
// GET LAST PRACTICE DATE
// ==========================================


export async function getLastPracticeDate(nodeId) {
    const logs = await db.practiceLogs
        .where("nodeId")
        .equals(nodeId)
        .toArray();

    logs.sort(
        (a, b) =>
            new Date(b.practicedAt) - new Date(a.practicedAt)
    );

    return logs.length > 0
        ? logs[0].practicedAt
        : null;
}


// ==========================================
// GET SKILL MAINTENANCE SUMMARY
// ==========================================

export async function getSkillMaintenance(nodeId) {
    const lastPracticedAt = await getLastPracticeDate(nodeId);

    if (!lastPracticedAt) {
        return {
            nodeId,
            lastPracticedAt: null,
            daysSincePractice: null,
            status: "never_practiced",
            label: "Never practiced"
        };
    }

    const daysSincePractice =
        calculateDaysSincePractice(lastPracticedAt);

    const maintenanceStatus =
        getMaintenanceStatus(daysSincePractice);

    return {
        nodeId,
        lastPracticedAt,
        daysSincePractice,
        status: maintenanceStatus.status,
        label: maintenanceStatus.label
    };
}

// ==========================================
// GET MAINTENANCE FOR ALL ACTIVE SKILLS
// ==========================================


export async function getAllSkillMaintenance() {
    const activeNodes = await db.nodes
        .where("isArchived")
        .equals(false)
        .toArray();

    const trackableNodes = activeNodes.filter(
        node => node.nodeType === "skill" ||
                node.nodeType === "competency"
    );

    const results = [];

    for (const node of trackableNodes) {
        const maintenance = await getSkillMaintenance(node.id);

        results.push({
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.nodeType,
            ...maintenance
        });
    }

    return results;
}


 
// ==========================================
// GET MAINTENANCE PRIORITY
// ==========================================

export function getMaintenancePriority(status) {
    const priorities = {
        fresh: "low",
        maintained: "low",
        needs_attention: "medium",
        at_risk: "high",
        overdue: "urgent",
        never_practiced: "medium"
    };

    if (!Object.hasOwn(priorities, status)) {
        throw new Error("Invalid maintenance status.");
    }

    return priorities[status];
}

// ==========================================
// GET MAINTENANCE RECOMMENDATION
// ==========================================

export function getMaintenanceRecommendation(status) {
    const recommendations = {
        fresh: "Continue your regular practice routine.",
        maintained: "Keep practicing to maintain your progress.",
        needs_attention: "Schedule a practice session soon.",
        at_risk: "Prioritize this skill for your next practice session.",
        overdue: "Revisit this skill and consider reassessing your ability.",
        never_practiced: "Start practicing this skill and establish a baseline."
    };

    if (!Object.hasOwn(recommendations, status)) {
        throw new Error("Invalid maintenance status.");
    }

    return recommendations[status];
}

// ==========================================
// GET MAINTENANCE DASHBOARD SUMMARY
// ==========================================

export async function getMaintenanceSummary() {
    const maintenance = await getAllSkillMaintenance();

    const summary = {
        totalSkills: maintenance.length,
        fresh: 0,
        maintained: 0,
        needsAttention: 0,
        atRisk: 0,
        overdue: 0,
        neverPracticed: 0,
        urgentSkills: []
    };

    for (const item of maintenance) {
        switch (item.status) {
            case "fresh":
                summary.fresh++;
                break;

            case "maintained":
                summary.maintained++;
                break;

            case "needs_attention":
                summary.needsAttention++;
                break;

            case "at_risk":
                summary.atRisk++;
                break;

            case "overdue":
                summary.overdue++;
                break;

            case "never_practiced":
                summary.neverPracticed++;
                break;
        }

        const priority = getMaintenancePriority(item.status);

        if (priority === "urgent" || priority === "high") {
            summary.urgentSkills.push({
                ...item,
                priority,
                recommendation: getMaintenanceRecommendation(
                    item.status
                )
            });
        }
    }

    return summary;
}

