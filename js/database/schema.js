
export function configureDatabase(db) {
    db.version(1).stores({
        nodes: "id, parentId, name, nodeType, isArchived, updatedAt",
        assessments: "id, nodeId, assessedAt",
        goals: "id, nodeId, status, deadline",
        evidence: "id, nodeId, verificationStatus, createdAt",
        resources: "id, nodeId, resourceType",
        practiceLogs: "id, nodeId, practicedAt",
        relationships: "id, sourceNodeId, targetNodeId, relationshipType, &[sourceNodeId+targetNodeId+relationshipType]",
        achievements: "id, &achievementKey, unlockedAt",
        settings: "&key"
    });

    // Database version 2: Quest progress tracking
    db.version(2).stores({
        nodes: "id, parentId, name, nodeType, isArchived, updatedAt",
        assessments: "id, nodeId, assessedAt",
        goals: "id, nodeId, status, deadline",
        evidence: "id, nodeId, verificationStatus, createdAt",
        resources: "id, nodeId, resourceType",
        practiceLogs: "id, nodeId, practicedAt",
        relationships: "id, sourceNodeId, targetNodeId, relationshipType, &[sourceNodeId+targetNodeId+relationshipType]",
        achievements: "id, &achievementKey, unlockedAt",
        settings: "&key"
    });
}
