
import { db } from "../database/db.js";

import {
    validateRequiredString,
    validateNodeType,
    validateTags
} from "./validation-service.js";

import {
    checkAchievementsSafely
} from "./achievement-check-service.js";

function getTimestamp() {
    return new Date().toISOString();
}

// ==========================================
// CREATE NODE
// ==========================================

export async function createNode({
    parentId = null,
    name,
    description = "",
    nodeType = "skill",
    tags = []
}) {
    const cleanName = validateRequiredString(name, "Node name");

    validateNodeType(nodeType);
    validateTags(tags);

    if (typeof description !== "string") {
        throw new Error("Description must be a string.");
    }

    if (parentId !== null) {
        if (typeof parentId !== "string" || !parentId.trim()) {
            throw new Error("Parent ID must be a valid string or null.");
        }

        const parent = await db.nodes.get(parentId);

        if (!parent) {
            throw new Error("Parent node does not exist.");
        }

        if (parent.isArchived) {
            throw new Error("Cannot add a child to an archived node.");
        }
    }

    const timestamp = getTimestamp();

    const node = {
        id: crypto.randomUUID(),
        parentId,
        name: cleanName,
        description,
        nodeType,
        tags: tags.map(tag => tag.trim()),
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await db.nodes.add(node);

    if (nodeType === "skill") {
        await checkAchievementsSafely();
    }

    return node;
}

// ==========================================
// READ NODES
// ==========================================

export async function getNode(id) {
    return await db.nodes.get(id);
}

export async function getAllNodes() {
    return await db.nodes.toArray();
}

export async function getChildren(parentId) {
    return await db.nodes
        .where("parentId")
        .equals(parentId)
        .toArray();
}

export async function getRootNodes() {
    const nodes = await getAllNodes();

    return nodes.filter(node => node.parentId === null);
}

export async function getActiveNodes() {
    return await db.nodes
        .where("isArchived")
        .equals(false)
        .toArray();
}

// ==========================================
// UPDATE NODE
// ==========================================

export async function updateNode(id, updates) {
    const existingNode = await db.nodes.get(id);

    if (!existingNode) {
        throw new Error("Node not found.");
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
        throw new Error("Updates must be an object.");
    }

    const allowedFields = [
        "name",
        "description",
        "nodeType",
        "tags",
        "parentId"
    ];

    const cleanUpdates = {};

    for (const field of allowedFields) {
        if (Object.hasOwn(updates, field)) {
            cleanUpdates[field] = updates[field];
        }
    }

    if (Object.hasOwn(cleanUpdates, "name")) {
        cleanUpdates.name = validateRequiredString(
            cleanUpdates.name,
            "Node name"
        );
    }

    if (Object.hasOwn(cleanUpdates, "description")) {
        if (typeof cleanUpdates.description !== "string") {
            throw new Error("Description must be a string.");
        }
    }

    if (Object.hasOwn(cleanUpdates, "nodeType")) {
        validateNodeType(cleanUpdates.nodeType);
    }

    if (Object.hasOwn(cleanUpdates, "tags")) {
        validateTags(cleanUpdates.tags);
        cleanUpdates.tags = cleanUpdates.tags.map(tag => tag.trim());
    }

    if (Object.hasOwn(cleanUpdates, "parentId")) {
        const newParentId = cleanUpdates.parentId;

        if (newParentId !== null) {
            if (typeof newParentId !== "string" || !newParentId.trim()) {
                throw new Error("Parent ID must be a string or null.");
            }

            const newParent = await db.nodes.get(newParentId);

            if (!newParent) {
                throw new Error("Parent node does not exist.");
            }

            if (newParent.isArchived) {
                throw new Error("Cannot move a node under an archived node.");
            }
        }

        if (newParentId === id) {
            throw new Error("A node cannot be its own parent.");
        }

        let currentParentId = newParentId;

        while (currentParentId !== null) {
            if (currentParentId === id) {
                throw new Error("Circular hierarchy detected.");
            }

            const currentParent = await db.nodes.get(currentParentId);

            if (!currentParent) {
                throw new Error("Invalid hierarchy: parent node not found.");
            }

            currentParentId = currentParent.parentId;
        }
    }

    cleanUpdates.updatedAt = getTimestamp();

    await db.nodes.update(id, cleanUpdates);

    return await db.nodes.get(id);
}

// ==========================================
// ARCHIVE AND RESTORE
// ==========================================

export async function archiveNode(id) {
    const node = await db.nodes.get(id);

    if (!node) {
        throw new Error("Node not found.");
    }

    await db.nodes.update(id, {
        isArchived: true,
        updatedAt: getTimestamp()
    });

    return await db.nodes.get(id);
}

export async function restoreNode(id) {
    const node = await db.nodes.get(id);

    if (!node) {
        throw new Error("Node not found.");
    }

    await db.nodes.update(id, {
        isArchived: false,
        updatedAt: getTimestamp()
    });

    return await db.nodes.get(id);
}

// ==========================================
// DELETE NODE
// ==========================================

export async function deleteNode(id) {
    await db.transaction(
        "rw",
        db.nodes,
        db.assessments,
        db.goals,
        db.evidence,
        db.resources,
        db.practiceLogs,
        db.relationships,
        db.breakthroughs,
        db.plannerActivities,
        async () => {
            const node = await db.nodes.get(id);

            if (!node) {
                throw new Error("Node not found.");
            }

            const childrenCount = await db.nodes
                .where("parentId")
                .equals(id)
                .count();

            if (childrenCount > 0) {
                throw new Error(
                    "Cannot delete a node that has children."
                );
            }

            const dependentTables = [
                db.assessments,
                db.goals,
                db.evidence,
                db.resources,
                db.practiceLogs,
                db.breakthroughs,
                db.plannerActivities
            ];

            for (const table of dependentTables) {
                const count = await table
                    .where("nodeId")
                    .equals(id)
                    .count();

                if (count > 0) {
                    throw new Error(
                        "Cannot delete a node with related records."
                    );
                }
            }

            const outgoingCount = await db.relationships
                .where("sourceNodeId")
                .equals(id)
                .count();

            const incomingCount = await db.relationships
                .where("targetNodeId")
                .equals(id)
                .count();

            if (outgoingCount > 0 || incomingCount > 0) {
                throw new Error(
                    "Cannot delete a node with relationships."
                );
            }

            await db.nodes.delete(id);
        }
    );

    return true;
}
