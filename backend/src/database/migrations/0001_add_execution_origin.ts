import { Migration } from "../migrations";

export default <Migration>{
    version: 1,
    name: 'add_execution_origin',
    up: `
        -- Add 'origin' field with value 'app' to all existing executions
        UPDATE executions 
        SET data = JSON_SET(data, '$.origin', 'app')
        WHERE JSON_EXTRACT(data, '$.origin') IS NULL;
    `,
    down: `
        -- Remove 'origin' field from all executions
        UPDATE executions 
        SET data = JSON_REMOVE(data, '$.origin');
    `,
}
