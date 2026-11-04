
import { db } from "../database/db.js";

import {
    validateRelationshipType
} from "./validation-service.js";

import {
    validateRelationshipReferences
} from "./integrity-service.js";

// ==========================================
// CREATE RELATIONSHIP
// ==========================================

export async function createRelationship({
    sourceNodeId,
    targetNodeId,
    relationshipType
}) {
    // Validate relationship type
    validateRelationshipType(relationshipType);

    // Validate both referenced nodes
    await validateRelationshipReferences({
        sourceNodeId,
        targetNodeId
    });

    const timestamp = new Date().toISOString();

    const relationship = {
        id: crypto.randomUUID(),
        sourceNodeId,
        targetNodeId,
        relationshipType,
        createdAt: timestamp
    };

    try {
        await db.relationships.add(relationship);
    } catch (error) {
        if (error.name === "ConstraintError") {
            throw new Error(
                "This relationship already exists."
            );
        }

        throw error;
    }

    return relationship;
}

// ==========================================
// GET RELATIONSHIPS FOR A NODE
// ==========================================

export async function getRelationshipsForNode(nodeId) {
    const outgoing = await db.relationships
        .where("sourceNodeId")
        .equals(nodeId)
        .toArray();

    const incoming = await db.relationships
        .where("targetNodeId")
        .equals(nodeId)
        .toArray();

    return {
        outgoing,
        incoming
    };
}

// ==========================================
// GET ALL RELATIONSHIPS
// ==========================================

export async function getAllRelationships() {
    return await db.relationships.toArray();
}

// ==========================================
// DELETE RELATIONSHIP
// ==========================================

export async function deleteRelationship(id) {
    const relationship = await db.relationships.get(id);

    if (!relationship) {
        throw new Error("Relationship not found.");
    }

    await db.relationships.delete(id);

    return true;
}
