import { Migration } from "../migrations";

// Import all migration files
import migration0001 from "./0001_add_execution_origin";

// Export all migrations in an array, sorted by version
// Add new migrations here as they are created
export const migrations: Migration[] = [
    migration0001,
].sort((a, b) => a.version - b.version);

// Export individual migrations for direct access if needed
export {
    migration0001,
};
