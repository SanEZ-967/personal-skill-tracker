
import { db } from "../database/db.js";

// ==========================================
// CHECK NODE EXISTENCE
// ==========================================

export async function nodeExists(nodeId) {
    if (typeof nodeId !== "string" || !nodeId.trim()) {
        return false;
    }

    const node = await db.nodes.get(nodeId);

    return Boolean(node);
}

// ==========================================
// VALIDATE NODE REFERENCE
// ==========================================

export async function validateNodeReference(nodeId) {
    if (!(await nodeExists(nodeId))) {
        throw new Error(
            `Referenced node does not exist: ${nodeId}`
        );
    }

    return true;
}

// ==========================================
// VALIDATE RELATIONSHIP REFERENCES
// ==========================================

export async function validateRelationshipReferences({
    sourceNodeId,
    targetNodeId
}) {
    if (sourceNodeId === targetNodeId) {
        throw new Error(
            "A node cannot have a relationship with itself."
        );
    }

    await validateNodeReference(sourceNodeId);
    await validateNodeReference(targetNodeId);

    return true;
}

// ==========================================
// CHECK DATABASE INTEGRITY
// ==========================================

export async function checkDatabaseIntegrity() {
    const issues = [];

    const tables = [
        { name: "assessments", field: "nodeId" },
        { name: "goals", field: "nodeId" },
        { name: "evidence", field: "nodeId" },
        { name: "resources", field: "nodeId" },
        { name: "practiceLogs", field: "nodeId" },
        { name: "breakthroughs", field: "nodeId" }
    ];

    // Check records that reference individual nodes.
    for (const tableInfo of tables) {
        const records = await db
            .table(tableInfo.name)
            .toArray();

        for (const record of records) {
            const nodeId = record[tableInfo.field];

            // Goals and practice logs may be standalone.
            if (
                nodeId === null &&
                (
                    tableInfo.name === "goals" ||
                    tableInfo.name === "practiceLogs"
                )
            ) {
                continue;
            }

            const exists = await nodeExists(nodeId);

            if (!exists) {
                issues.push({
                    table: tableInfo.name,
                    recordId: record.id,
                    problem: "Referenced node does not exist."
                });
            }
        }
    }

    // Check Planner activity references.
    const plannerActivities =
        await db.plannerActivities.toArray();

    for (const activity of plannerActivities) {
        if (activity.nodeId !== null) {
            const referencedNodeExists = await nodeExists(
                activity.nodeId
            );

            if (!referencedNodeExists) {
                issues.push({
                    table: "plannerActivities",
                    recordId: activity.id,
                    problem: "Referenced node does not exist."
                });
            }
        }

        if (activity.goalId !== null) {
            const referencedGoal = await db.goals.get(
                activity.goalId
            );

            if (!referencedGoal) {
                issues.push({
                    table: "plannerActivities",
                    recordId: activity.id,
                    problem: "Referenced goal does not exist."
                });
            }
        }
    }

    // Check node parent references.
    const nodes = await db.nodes.toArray();

    for (const node of nodes) {
        if (node.parentId !== null) {
            const parentExists = await nodeExists(
                node.parentId
            );

            if (!parentExists) {
                issues.push({
                    table: "nodes",
                    recordId: node.id,
                    problem: "Parent node does not exist."
                });
            }
        }
    }

    // Check cross-node relationships.
    const relationships =
        await db.relationships.toArray();

    for (const relationship of relationships) {
        const sourceExists = await nodeExists(
            relationship.sourceNodeId
        );

        const targetExists = await nodeExists(
            relationship.targetNodeId
        );

        if (!sourceExists || !targetExists) {
            issues.push({
                table: "relationships",
                recordId: relationship.id,
                problem: "One or both related nodes do not exist."
            });
        }

        if (
            relationship.sourceNodeId ===
            relationship.targetNodeId
        ) {
            issues.push({
                table: "relationships",
                recordId: relationship.id,
                problem: "Self-referencing relationship detected."
            });
        }
    }

    return {
        isValid: issues.length === 0,
        issueCount: issues.length,
        issues
    };
}
