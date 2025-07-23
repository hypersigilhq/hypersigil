import { Migration } from "../migrations";

// Import all migration files
import migration0001 from "./0001_add_execution_origin";
import migration0002 from "./0002_change_claude_to_anthropic";

// Export all migrations in an array, sorted by version
// Add new migrations here as they are created
export const migrations: Migration[] = [
    migration0001,
    migration0002,
].sort((a, b) => a.version - b.version);
