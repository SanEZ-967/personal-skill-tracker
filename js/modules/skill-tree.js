
import { getActiveNodes } from "../services/node-service.js";
import { getAllAssessments } from "../services/assessment-service.js";
import { getDomains } from "../services/taxonomy-service.js";

let searchTerm = "";
let expandedNodes = new Set();

function getLatestAssessments(assessments) {
    const latest = new Map();

    for (const assessment of assessments) {
        const existing = latest.get(assessment.nodeId);

        if (
            !existing ||
            new Date(assessment.assessedAt) >
                new Date(existing.assessedAt)
        ) {
            latest.set(assessment.nodeId, assessment);
        }
    }

    return latest;
}

function buildTree(nodes) {
    const nodeMap = new Map();

    for (const node of nodes) {
        nodeMap.set(node.id, {
            ...node,
            children: []
        });
    }

    const roots = [];

    for (const node of nodeMap.values()) {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId).children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

function getDomainForRoot(root, domains) {
    return domains.find(domain => domain.id === root.domainId) ?? null;
}

function matchesSearch(node, term) {
    return node.name.toLowerCase().includes(term);
}

function hasMatchingDescendant(node, term) {
    return node.children.some(child =>
        matchesSearch(child, term) ||
        hasMatchingDescendant(child, term)
    );
}

function renderNode(node, assessments, depth = 0) {
    const assessment = assessments.get(node.id);

    let proficiency = "Not assessed";

    if (assessment) {
        const overall = Math.round(
            (
                assessment.knowledgeScore +
                assessment.practicalScore +
                assessment.consistencyScore
            ) / 3
        );

        proficiency = `Level ${overall}`;
    }

    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const childrenHTML = hasChildren && isExpanded
        ? node.children
            .filter(child =>
                !searchTerm ||
                matchesSearch(child, searchTerm) ||
                hasMatchingDescendant(child, searchTerm)
            )
            .map(child => renderNode(child, assessments, depth + 1))
            .join("")
        : "";

    return `
        <div class="skill-tree-node" style="--node-depth: ${depth}">
            <div class="skill-tree-node-content">
                ${
                    hasChildren
                        ? `<button
                                class="skill-tree-toggle"
                                data-toggle-node="${node.id}"
                                aria-label="${isExpanded ? "Collapse" : "Expand"} ${node.name}"
                            >
                                <i data-lucide="${isExpanded ? "chevron-down" : "chevron-right"}"></i>
                            </button>`
                        : `<span class="skill-tree-toggle-placeholder"></span>`
                }

                <div class="skill-tree-node-info">
                    <span class="skill-tree-node-name">
                        ${escapeHTML(node.name)}
                    </span>
                    <span class="skill-tree-node-level">
                        ${proficiency}
                    </span>
                </div>

                <span class="skill-tree-node-type">
                    ${escapeHTML(node.nodeType)}
                </span>
            </div>

            ${childrenHTML}
        </div>
    `;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function renderDomainSection(domain, roots, assessments) {
    const visibleRoots = roots.filter(root =>
        !searchTerm ||
        matchesSearch(root, searchTerm) ||
        hasMatchingDescendant(root, searchTerm)
    );

    if (visibleRoots.length === 0) {
        return "";
    }

    return `
        <section class="skill-tree-domain">
            <h3 class="skill-tree-domain-title">
                ${escapeHTML(domain.name)}
            </h3>

            <div class="skill-tree-domain-nodes">
                ${visibleRoots
                    .map(root => renderNode(root, assessments))
                    .join("")}
            </div>
        </section>
    `;
}

function renderSkillTree(container, nodes, assessments, domains) {
    const roots = buildTree(nodes);

    const sections = domains.map(domain => {
        const domainRoots = roots.filter(
            root => root.domainId === domain.id
        );

        return renderDomainSection(domain, domainRoots, assessments);
    });

    const uncategorizedRoots = roots.filter(root =>
        !domains.some(domain => domain.id === root.domainId)
    );

    const uncategorizedDomain = {
        name: "Uncategorized"
    };

    sections.push(
        renderDomainSection(
            uncategorizedDomain,
            uncategorizedRoots,
            assessments
        )
    );

    container.innerHTML = `
        <div class="skill-tree-header">
            <div>
                <h2>Skill Tree</h2>
                <p>Explore your skills and their sub-skills.</p>
            </div>
        </div>

        <div class="skill-tree-search">
            <input
                type="search"
                id="skill-tree-search"
                placeholder="Search skills..."
                value="${escapeHTML(searchTerm)}"
            />
        </div>

        <div class="skill-tree-content">
            ${
                nodes.length === 0
                    ? `<p class="skill-tree-empty">
                            No skills yet. Add your first skill to get started.
                       </p>`
                    : sections.join("")
            }
        </div>
    `;

    const searchInput = container.querySelector("#skill-tree-search");

    searchInput.addEventListener("input", event => {
        searchTerm = event.target.value.trim().toLowerCase();
        renderSkillTree(container, nodes, assessments, domains);
    });

    container.querySelectorAll("[data-toggle-node]").forEach(button => {
        button.addEventListener("click", () => {
            const nodeId = button.dataset.toggleNode;

            if (expandedNodes.has(nodeId)) {
                expandedNodes.delete(nodeId);
            } else {
                expandedNodes.add(nodeId);
            }

            renderSkillTree(container, nodes, assessments, domains);
        });
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export async function mountSkillTree(container) {
    if (!container) {
        return;
    }

    container.innerHTML = "<p>Loading skill tree...</p>";

    try {
        const [nodes, assessments] = await Promise.all([
            getActiveNodes(),
            getAllAssessments()
        ]);

        const domains = getDomains();

        renderSkillTree(
            container,
            nodes,
            getLatestAssessments(assessments),
            domains
        );
    } catch (error) {
        console.error("Failed to load skill tree:", error);

        container.innerHTML = `
            <p class="skill-tree-error">
                Unable to load the skill tree. Please try again.
            </p>
        `;
    }
}
