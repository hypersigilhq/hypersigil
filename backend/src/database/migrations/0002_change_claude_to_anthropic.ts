import { Migration } from "../migrations";

export default <Migration>{
    version: 2,
    name: 'change_claude_to_anthropic',
    up: `
        -- Add 'origin' field with value 'app' to all existing executions
        UPDATE executions 
        SET data = JSON_SET(data, '$.provider', 'anthropic')
        WHERE JSON_EXTRACT(data, '$.provider') = 'claude';
    `,
    down: `
    `,
}
