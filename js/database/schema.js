export function configureDatabase(db) {
    db.version(1).stores({

        // Skill tree
        nodes:
            "id, parentId, name, nodeType, isArchived, updatedAt",

        // Skill assessments
        assessments:
            "id, nodeId, assessedAt",

        // Development goals
        goals:
            "id, nodeId, status, deadline",

        // Skill evidence
        evidence:
            "id, nodeId, verificationStatus, createdAt",

        // Learning resources
        resources:
            "id, nodeId, resourceType",

        // Practice history
        practiceLogs:
            "id, nodeId, practicedAt",

        // Cross-domain relationships
        relationships:
            "id, sourceNodeId, targetNodeId, relationshipType, &[sourceNodeId+targetNodeId+relationshipType]",

        // Unlocked achievements
        achievements:
            "id, &achievementKey, unlockedAt",

        // Application settings
        settings:
            "&key"

    });
}