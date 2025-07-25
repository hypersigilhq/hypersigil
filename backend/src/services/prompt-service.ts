import Ajv from 'ajv';
import addFormats from "ajv-formats"
import * as mustache from 'mustache';
import { PromptVersion, TestDataItem } from '../models';
import { JSONSchema } from '../providers/base-provider';
class PromptService {
    // Method to compile a prompt with test data using mustache
    public compilePromptVersion(testDataItem: TestDataItem, promptVersion: PromptVersion): { success: true; compiledPrompt: string } | { success: false; error: string } {
        const res = this.compilePrompt(testDataItem.content, promptVersion.prompt)
        if (res.err) {
            return { success: false, error: res.error.error }
        }
        return { success: true, compiledPrompt: res.data }
    }

    public compilePrompt(data: string, prompt: string, inputSchema?: JSONSchema): Result<string, { error: string, details?: unknown[] | undefined }> {
        // Parse the test data item content as JSON
        let input: any;
        try {
            input = JSON.parse(data);
        } catch (parseError) {
            return Err({ error: `Invalid JSON in test data item content: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}` })
        }

        if (inputSchema) {
            let valid = this.validateData(input, inputSchema)
            if (!valid.valid) {
                return Err({ error: valid.validation_message || 'Error validating input', details: valid.validation_details })
            }
        }

        // Compile the prompt using mustache
        const compiledPrompt = mustache.render(prompt, input);

        return Ok(compiledPrompt)
    }

    public validateData(data: any, jsonSchema?: JSONSchema): {
        valid: boolean;
        validation_message?: string;
        validation_details?: unknown[];
    } {
        // If no schema is provided, consider it valid
        if (!jsonSchema) {
            return { valid: true };
        }

        // Create Ajv instance
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv)

        try {
            // Compile the schema
            const validate = ajv.compile(jsonSchema);

            // Validate the result
            const valid = validate(data);

            if (valid) {
                return {
                    valid: true
                };
            } else {
                // Generate error message
                let s = new Set<string>()
                validate.errors?.map(err => `${err.instancePath} ${err.message}`.trim()).forEach(el => s.add(el))
                return {
                    valid: false,
                    validation_message: Array.from(s).join('; ').trim(),
                    ...(validate.errors && { validation_details: validate.errors })
                };
            }
        } catch (error: any) {
            return {
                valid: false,
                validation_message: error.message
            };
        }
    }
}

export const promptService = new PromptService()