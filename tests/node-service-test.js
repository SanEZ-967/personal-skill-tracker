import {
    createNode,
    getNode,
    getAllNodes,
    getChildren,
    getRootNodes,
    updateNode,
    archiveNode,
    restoreNode,
    deleteNode
} from "../js/services/node-service.js";

import { db } from "../js/database/db.js";

export async function runNodeServiceTests() {
    console.log("Starting node service tests...");

    let parentNode = null;
    let childNode = null;

    try {
        // Test 1: Create a parent node
        parentNode = await createNode({
            name: "TEST - Mathematics",
            description: "Temporary test category",
            nodeType: "category"
        });

        console.assert(parentNode.id, "Test 1 failed: Node creation");
        console.log("Test 1 passed: Create parent node.");

        // Test 2: Create a child node
        childNode = await createNode({
            parentId: parentNode.id,
            name: "TEST - Algebra",
            description: "Temporary test skill",
            nodeType: "skill"
        });

        console.assert(
            childNode.parentId === parentNode.id,
            "Test 2 failed: Child creation"
        );
        console.log("Test 2 passed: Create child node.");

        // Test 3: Retrieve a node
        const retrievedNode = await getNode(childNode.id);

        console.assert(
            retrievedNode.id === childNode.id,
            "Test 3 failed: Retrieve node"
        );
        console.log("Test 3 passed: Retrieve node.");

        // Test 4: Retrieve all nodes
        const allNodes = await getAllNodes();

        console.assert(
            allNodes.some(node => node.id === childNode.id),
            "Test 4 failed: Retrieve all nodes"
        );
        console.log("Test 4 passed: Retrieve all nodes.");

        // Test 5: Retrieve children
        const children = await getChildren(parentNode.id);

        console.assert(
            children.some(node => node.id === childNode.id),
            "Test 5 failed: Retrieve children"
        );
        console.log("Test 5 passed: Retrieve children.");

        // Test 6: Retrieve root nodes
        const rootNodes = await getRootNodes();

        console.assert(
            rootNodes.some(node => node.id === parentNode.id),
            "Test 6 failed: Retrieve root nodes"
        );
        console.log("Test 6 passed: Retrieve root nodes.");

        // Test 7: Update a node
        const updatedNode = await updateNode(childNode.id, {
            name: "TEST - Updated Algebra"
        });

        console.assert(
            updatedNode.name === "TEST - Updated Algebra",
            "Test 7 failed: Update node"
        );
        console.log("Test 7 passed: Update node.");

        // Test 8: Archive a node
        const archivedNode = await archiveNode(childNode.id);

        console.assert(
            archivedNode.isArchived === true,
            "Test 8 failed: Archive node"
        );
        console.log("Test 8 passed: Archive node.");

        // Test 9: Restore a node
        const restoredNode = await restoreNode(childNode.id);

        console.assert(
            restoredNode.isArchived === false,
            "Test 9 failed: Restore node"
        );
        console.log("Test 9 passed: Restore node.");

        // Test 10: Delete child node
        await deleteNode(childNode.id);
        childNode = null;

        console.log("Test 10 passed: Delete child node.");

        // Test 11: Delete parent node
        await deleteNode(parentNode.id);
        parentNode = null;

        console.log("Test 11 passed: Delete parent node.");
// Test 12: Prevent a node from becoming its own parent
const hierarchyParent = await createNode({
    name: "TEST - Hierarchy Parent",
    nodeType: "category"
});

let selfParentRejected = false;

try {
    await updateNode(hierarchyParent.id, {
        parentId: hierarchyParent.id
    });
} catch (error) {
    selfParentRejected = true;
}

console.assert(
    selfParentRejected,
    "Test 12 failed: Self-parenting was allowed."
);

console.log("Test 12 passed: Prevent self-parenting.");


// Test 13: Prevent circular hierarchy
const hierarchyChild = await createNode({
    parentId: hierarchyParent.id,
    name: "TEST - Hierarchy Child",
    nodeType: "skill"
});

let circularHierarchyRejected = false;

try {
    await updateNode(hierarchyParent.id, {
        parentId: hierarchyChild.id
    });
} catch (error) {
    circularHierarchyRejected = true;
}

console.assert(
    circularHierarchyRejected,
    "Test 13 failed: Circular hierarchy was allowed."
);

console.log("Test 13 passed: Prevent circular hierarchy.");


// Test 14: Allow a valid parent change
const anotherParent = await createNode({
    name: "TEST - Another Parent",
    nodeType: "category"
});

const movedNode = await updateNode(hierarchyChild.id, {
    parentId: anotherParent.id
});

console.assert(
    movedNode.parentId === anotherParent.id,
    "Test 14 failed: Valid parent change."
);

console.log("Test 14 passed: Allow valid parent change.");


// Clean up hierarchy test nodes
await deleteNode(hierarchyChild.id);
await deleteNode(hierarchyParent.id);
await deleteNode(anotherParent.id);
// Test 15: Reject empty node name
let emptyNameRejected = false;

try {
    await createNode({
        name: "   ",
        nodeType: "skill"
    });
} catch (error) {
    emptyNameRejected = true;
}

console.assert(
    emptyNameRejected,
    "Test 15 failed: Empty name was accepted."
);

console.log("Test 15 passed: Reject empty node name.");


// Test 16: Reject invalid node type
let invalidTypeRejected = false;

try {
    await createNode({
        name: "TEST - Invalid Type",
        nodeType: "invalid"
    });
} catch (error) {
    invalidTypeRejected = true;
}

console.assert(
    invalidTypeRejected,
    "Test 16 failed: Invalid node type was accepted."
);

console.log("Test 16 passed: Reject invalid node type.");


// Test 17: Reject nonexistent parent
let missingParentRejected = false;

try {
    await createNode({
        parentId: crypto.randomUUID(),
        name: "TEST - Missing Parent",
        nodeType: "skill"
    });
} catch (error) {
    missingParentRejected = true;
}

console.assert(
    missingParentRejected,
    "Test 17 failed: Nonexistent parent was accepted."
);

console.log("Test 17 passed: Reject nonexistent parent.");


// Test 18: Reject archived parent
const archivedParent = await createNode({
    name: "TEST - Archived Parent",
    nodeType: "category"
});

await archiveNode(archivedParent.id);

let archivedParentRejected = false;

try {
    await createNode({
        parentId: archivedParent.id,
        name: "TEST - Child of Archived Parent",
        nodeType: "skill"
    });
} catch (error) {
    archivedParentRejected = true;
}

console.assert(
    archivedParentRejected,
    "Test 18 failed: Archived parent was accepted."
);

console.log("Test 18 passed: Reject archived parent.");


// Clean up archived parent
await deleteNode(archivedParent.id);
        console.log("All node service tests completed successfully.");

    } catch (error) {
        console.error("Node service test failed:", error);
        throw error;

    } finally {
        // Clean up temporary test records if a test fails
        if (childNode) {
            await db.nodes.delete(childNode.id);
        }

        if (parentNode) {
            await db.nodes.delete(parentNode.id);
        }
    }
}