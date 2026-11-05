
import taxonomy from "../../data/default-taxonomy.json";

// ==========================================
// DOMAIN DATA
// ==========================================

export function getDomains() {
    return taxonomy.domains;
}

export function getDomain(domainId) {
    if (!domainId) {
        return null;
    }

    return taxonomy.domains.find(
        domain => domain.id === domainId
    ) ?? null;
}

export function isValidDomain(domainId) {
    if (domainId === null) {
        return true;
    }

    if (typeof domainId !== "string" || !domainId.trim()) {
        return false;
    }

    return taxonomy.domains.some(
        domain => domain.id === domainId
    );
}

// ==========================================
// DOMAIN VALIDATION
// ==========================================

export function validateDomainId(domainId) {
    if (!isValidDomain(domainId)) {
        throw new Error(
            `Invalid domain ID: ${domainId}`
        );
    }

    return domainId;
}
