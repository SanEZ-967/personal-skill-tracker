
import { db } from "../database/db.js";

import {
    checkDatabaseIntegrity
} from "./integrity-service.js";

// ==========================================
// BACKUP CONSTANTS
// ==========================================

const BACKUP_FORMAT = "personal-skill-tracker-backup";
const BACKUP_FORMAT_VERSION = 1;

const REQUIRED_TABLES = [
    "nodes",
    "assessments",
    "goals",
    "evidence",
    "resources",
    "practiceLogs",
    "relationships",
    "achievements",
    "settings"
];

// ==========================================
// EXPORT DATABASE
// ==========================================

export async function exportDatabase() {
    const backup = {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        databaseName: db.name,
        databaseVersion: db.verno,
        exportedAt: new Date().toISOString(),
        data: {}
    };

    for (const table of db.tables) {
        backup.data[table.name] = await table.toArray();
    }

    return backup;
}

// ==========================================
// DOWNLOAD BACKUP FILE
// ==========================================

export async function downloadBackup() {
    const backup = await exportDatabase();

    const json = JSON.stringify(backup, null, 4);

    const blob = new Blob(
        [json],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const date = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    link.href = url;
    link.download = `personal-skill-tracker-backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return true;
}

// ==========================================
// VALIDATE BACKUP
// ==========================================

export function validateBackup(backup) {
    if (
        !backup ||
        typeof backup !== "object" ||
        Array.isArray(backup)
    ) {
        throw new Error("Invalid backup file structure.");
    }

    if (backup.format !== BACKUP_FORMAT) {
        throw new Error("Unrecognized backup format.");
    }

    if (backup.formatVersion !== BACKUP_FORMAT_VERSION) {
        throw new Error("Unsupported backup format version.");
    }

    if (
        typeof backup.databaseName !== "string" ||
        !backup.databaseName.trim()
    ) {
        throw new Error("Invalid database name in backup.");
    }

    if (
        !Number.isInteger(backup.databaseVersion) ||
        backup.databaseVersion < 1
    ) {
        throw new Error("Invalid database version in backup.");
    }

    if (
        typeof backup.exportedAt !== "string" ||
        Number.isNaN(Date.parse(backup.exportedAt))
    ) {
        throw new Error("Invalid backup export timestamp.");
    }

    if (
        !backup.data ||
        typeof backup.data !== "object" ||
        Array.isArray(backup.data)
    ) {
        throw new Error("Backup data is missing or invalid.");
    }

    for (const tableName of REQUIRED_TABLES) {
        if (!Array.isArray(backup.data[tableName])) {
            throw new Error(
                `Missing or invalid table data: ${tableName}.`
            );
        }
    }

    return true;
}

// ==========================================
// RESTORE DATABASE
// ==========================================

export async function restoreDatabase(backup) {
    // Validate before changing existing data
    validateBackup(backup);

    // Only restore backups matching the current schema version
    if (backup.databaseVersion !== db.verno) {
        throw new Error(
            "Backup database version is incompatible with this application."
        );
    }

    const tables = REQUIRED_TABLES.map(
        tableName => db.table(tableName)
    );

    await db.transaction(
        "rw",
        ...tables,
        async () => {
            // Clear existing data and import backup records
            for (const tableName of REQUIRED_TABLES) {
                const table = db.table(tableName);
                const records = backup.data[tableName];

                await table.clear();

                if (records.length > 0) {
                    await table.bulkAdd(records);
                }
            }

            // Verify restored references before committing
            const integrity = await checkDatabaseIntegrity();

            if (!integrity.isValid) {
                throw new Error(
                    `Restored database contains ${integrity.issueCount} integrity issue(s).`
                );
            }
        }
    );

    return true;
}

// ==========================================
// READ AND RESTORE BACKUP FILE
// ==========================================

export async function restoreBackupFile(file) {
    if (!(file instanceof File)) {
        throw new Error("Please select a valid backup file.");
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Backup file must be a JSON file.");
    }

    const text = await file.text();

    let backup;

    try {
        backup = JSON.parse(text);
    } catch {
        throw new Error("Backup file contains invalid JSON.");
    }

    await restoreDatabase(backup);

    return true;
}
