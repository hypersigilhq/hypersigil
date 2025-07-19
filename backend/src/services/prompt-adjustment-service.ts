import { commentModel, Comment } from '../models/comment';
import { executionModel, Execution } from '../models/execution';
import { promptModel } from '../models/prompt';
import * as Mustache from 'mustache';

export interface AdjustmentPromptResult {
    adjustmentPrompt: string;
    originalPrompt: string;
    commentsProcessed: number;
}

export class PromptAdjustmentService {
    private static instance: PromptAdjustmentService;

    private constructor() { }

    public static getInstance(): PromptAdjustmentService {
        if (!PromptAdjustmentService.instance) {
            PromptAdjustmentService.instance = new PromptAdjustmentService();
        }
        return PromptAdjustmentService.instance;
    }

    /**
     * Generate an adjustment prompt based on comments and their associated execution results
     */
    public async generateAdjustmentPrompt(
        commentIds: string[],
        promptId: string,
        summarize: boolean = false
    ): Promise<AdjustmentPromptResult> {
        // Validate prompt exists
        const prompt = await promptModel.findById(promptId);
        if (!prompt) {
            throw new Error(`Prompt not found: ${promptId}`);
        }

        // Get the current version of the prompt
        const currentVersion = promptModel.getVersion(prompt, prompt.current_version);
        if (!currentVersion) {
            throw new Error(`Current prompt version not found: ${prompt.current_version}`);
        }

        // Fetch all comments by IDs
        const comments = await this.fetchAndValidateComments(commentIds, promptId);

        // Group comments by execution_id
        const { executionComments, genericComments } = this.groupCommentsByExecution(comments);

        // Fetch and validate execution results
        const executionResults = await this.fetchAndValidateExecutions(
            Array.from(executionComments.keys())
        );

        // Generate the adjustment prompt
        const adjustmentPrompt = this.buildAdjustmentPrompt(
            currentVersion.prompt,
            executionResults,
            executionComments,
            genericComments,
            summarize
        );

        return {
            adjustmentPrompt,
            originalPrompt: currentVersion.prompt,
            commentsProcessed: comments.length
        };
    }

    /**
     * Fetch comments and validate they belong to the specified prompt
     */
    private async fetchAndValidateComments(
        commentIds: string[],
        promptId: string
    ): Promise<Comment[]> {
        const comments: Comment[] = [];

        for (const commentId of commentIds) {
            const comment = await commentModel.findById(commentId);
            if (!comment) {
                throw new Error(`Comment not found: ${commentId}`);
            }

            // Validate comment belongs to the prompt
            if (comment.prompt_id !== promptId) {
                throw new Error(
                    `Comment ${commentId} does not belong to prompt ${promptId}`
                );
            }

            comments.push(comment);
        }

        return comments;
    }

    /**
     * Group comments by execution_id, separating generic comments
     */
    private groupCommentsByExecution(comments: Comment[]): {
        executionComments: Map<string, Comment[]>;
        genericComments: Comment[];
    } {
        const executionComments = new Map<string, Comment[]>();
        const genericComments: Comment[] = [];

        for (const comment of comments) {
            if (comment.execution_id) {
                if (!executionComments.has(comment.execution_id)) {
                    executionComments.set(comment.execution_id, []);
                }
                executionComments.get(comment.execution_id)!.push(comment);
            } else {
                genericComments.push(comment);
            }
        }

        return { executionComments, genericComments };
    }

    /**
     * Fetch executions and validate they have successful results
     */
    private async fetchAndValidateExecutions(
        executionIds: string[]
    ): Promise<Map<string, Execution>> {
        const executionResults = new Map<string, Execution>();

        for (const executionId of executionIds) {
            const execution = await executionModel.findById(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }

            // Validate execution has completed successfully
            if (execution.status !== 'completed') {
                throw new Error(
                    `Execution ${executionId} has not completed successfully. Status: ${execution.status}`
                );
            }

            // Validate execution has a result
            if (!execution.result) {
                throw new Error(`Execution ${executionId} has no result`);
            }

            executionResults.set(executionId, execution);
        }

        return executionResults;
    }

    /**
     * Build the formatted adjustment prompt using Mustache templating
     */
    private buildAdjustmentPrompt(
        originalPrompt: string,
        executionResults: Map<string, Execution>,
        executionComments: Map<string, Comment[]>,
        genericComments: Comment[],
        summarize: boolean = false
    ): string {

        let task = `Your task is to calibrate <OriginalPrompt> based on the <Execution> list provided.
Calibration means reviewing all the comments and feedback, then applying necessary changes to the original prompt to address the issues and improve performance. You should analyze each comment, understand what went wrong or could be improved, and modify the original prompt accordingly. You must only provide feedback related to comments.`

        if (summarize) {
            task = `Your task is to summarize changes for the <OriginalPrompt> based on the <Execution> list provided.
Summarize means reviewing all the comments and feedback and providing a consolidate list of proposed changes to the <OriginalPrompt>.ś`
        }

        const template = `<Instructions>
You are an experienced prompt engineer.

${task}

<Execution> is a result of running an <OriginalPrompt> where <Result> is an LLM model output, since the prompt can contain template placeholders, the <UserInput> contains the placeholder values. The <Result> has been reviewed and a list of <Comment> was created.
Each <Comment> is supplied with <ReviewerComment> as an original comment from a reviewer and <ResultQuote> which is a part of the <Result> that has been referenced by the reviewer when writing that comment.
You are also supplied with a list of <GenericComment> which is a comment without any quotation.

After reviewing all feedback, provide a revised version of the original prompt that addresses the identified issues.
</Instructions>
        
<OriginalPrompt>{{{originalPrompt}}}<OriginalPrompt>


{{#hasExecutionComments}}
{{#executionSections}}
<Execution>
    <UserInput>{{{userInput}}}</UserInput>
    <Result>{{{result}}}</Result>
    {{#comments}}
        <Comment>
            <ResultQuote>{{{selectedText}}}</ResultQuote>
            <ReviewerComment>{{{text}}}</ReviewerComment>
        </Comment>
    {{/comments}}
</Execution>
{{/executionSections}}
{{/hasExecutionComments}}

{{#hasGenericComments}}
{{#genericComments}}
<GenericComment>{{{text}}}</GenericComment>
{{/genericComments}}
{{/hasGenericComments}}`;

        // Prepare execution sections data
        const executionSections = Array.from(executionComments.entries()).map(([executionId, comments]) => {
            const execution = executionResults.get(executionId)!;
            return {
                executionId,
                userInput: execution.user_input,
                result: execution.result,
                comments: comments.map(comment => ({
                    text: comment.text,
                    hasSelectedText: comment.data.type === 'execution' && comment.data.selected_text,
                    selectedText: comment.data.type === 'execution' ? comment.data.selected_text : undefined
                }))
            };
        });

        // Prepare template data
        const templateData = {
            originalPrompt,
            hasExecutionComments: executionComments.size > 0,
            executionSections,
            hasGenericComments: genericComments.length > 0,
            genericComments: genericComments.map(comment => ({
                text: comment.text
            }))
        };

        return Mustache.render(template, templateData);
    }
}

// Export singleton instance
export const promptAdjustmentService = PromptAdjustmentService.getInstance();
