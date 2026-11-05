
import { db } from "../database/db.js";

import {
    validateBreakthrough
} from "./progression-service.js";

import {
    validateNodeReference
} from "./integrity-service.js";

import {
    checkAchievementsSafely
} from "./achievement-check-service.js";

// ==========================================
// RECORD A BREAKTHROUGH
// ==========================================

export async function recordBreakthrough({
    nodeId,
    unlockedLevel,
    knowledgeScore,
    practicalScore,
    consistencyScore,
    hasPracticalChallenge,
    hasEvidence
}) {
    // Confirm that the skill exists.
    await validateNodeReference(nodeId);

    // Validate all breakthrough requirements.
    const result = validateBreakthrough({
        unlockedLevel,
        knowledgeScore,
        practicalScore,
        consistencyScore,
        hasPracticalChallenge,
        hasEvidence
    });

    const outcome = await db.transaction(
        "rw",
        db.breakthroughs,
        async () => {
            const existing = await db.breakthroughs
                .where("[nodeId+newLevel]")
                .equals([nodeId, result.newLevel])
                .first();

            if (existing) {
                return {
                    recorded: false,
                    alreadyRecorded: true,
                    breakthrough: existing
                };
            }

            const breakthrough = {
                id: crypto.randomUUID(),
                nodeId,
                previousLevel: result.previousLevel,
                newLevel: result.newLevel,
                assessedLevel: result.assessedLevel,
                unlockedAt: new Date().toISOString()
            };

            await db.breakthroughs.add(breakthrough);

            return {
                recorded: true,
                alreadyRecorded: false,
                breakthrough
            };
        }
    );

    // Safely check achievements after a new breakthrough.
    if (outcome.recorded) {
        await checkAchievementsSafely();
    }

    return outcome;
}

// ==========================================
// GET BREAKTHROUGHS FOR A SKILL
// ==========================================

export async function getBreakthroughsForNode(nodeId) {
    const breakthroughs = await db.breakthroughs
        .where("nodeId")
        .equals(nodeId)
        .toArray();

    return breakthroughs.sort(
        (a, b) =>
            new Date(b.unlockedAt) - new Date(a.unlockedAt)
    );
}

// ==========================================
// GET ALL BREAKTHROUGHS
// ==========================================

export async function getAllBreakthroughs() {
    const breakthroughs = await db.breakthroughs.toArray();

    return breakthroughs.sort(
        (a, b) =>
            new Date(b.unlockedAt) - new Date(a.unlockedAt)
    );
}

// ==========================================
// GET BREAKTHROUGH COUNT
// ==========================================

export async function getBreakthroughCount() {
    return await db.breakthroughs.count();
}

// ==========================================
// GET LATEST BREAKTHROUGH
// ==========================================

export async function getLatestBreakthrough(nodeId) {
    const breakthroughs = await getBreakthroughsForNode(nodeId);

    return breakthroughs.length > 0
        ? breakthroughs[0]
        : null;
}
