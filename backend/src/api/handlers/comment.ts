import { RegisterHandlers } from 'ts-typed-api';
import app, { loggingMiddleware, timingMiddleware } from '../../app';
import { commentModel } from '../../models/comment';
import { z } from 'zod';
import { CommentApiDefinition } from '../definitions/comment';

function formatCommentForResponse(comment: any) {
    return {
        id: comment.id,
        text: comment.text,
        data: comment.data,
        created_at: comment.created_at instanceof Date ? comment.created_at.toISOString() : comment.created_at,
        updated_at: comment.updated_at instanceof Date ? comment.updated_at.toISOString() : comment.updated_at
    };
}

RegisterHandlers(app, CommentApiDefinition, {
    comments: {
        create: async (req, res) => {
            try {
                const newComment = await commentModel.create(req.body);
                res.respond(201, formatCommentForResponse(newComment));
            } catch (error) {
                console.error('Error creating comment:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create comment'
                });
            }
        },

        list: async (req, res) => {
            try {
                const { prompt_id, execution_id } = req.query;

                // Validate that at least one parameter is provided
                if (!prompt_id && !execution_id) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Either prompt_id or execution_id must be provided'
                    });
                }

                // Validate that only one parameter is provided
                if (prompt_id && execution_id) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Only one of prompt_id or execution_id should be provided, not both'
                    });
                }

                let comments;

                if (prompt_id) {
                    // Query comments by prompt_id using JSON path
                    comments = await commentModel.findByProperty('prompt_id', prompt_id)
                } else if (execution_id) {
                    // Query comments by execution_id using JSON path
                    comments = await commentModel.findByProperty('execution_id', execution_id)
                }

                const formattedComments = comments?.map(formatCommentForResponse) || [];
                res.respond(200, formattedComments);
            } catch (error) {
                console.error('Error listing comments:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve comments'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;

                // Check if comment exists before attempting to delete
                const existingComment = await commentModel.findById(id);
                if (!existingComment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Comment not found'
                    });
                }

                // Delete the comment
                const deleted = await commentModel.delete(id);

                if (deleted) {
                    res.respond(204, {});
                } else {
                    res.respond(500, {
                        error: 'Internal Server Error',
                        message: 'Failed to delete comment'
                    });
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete comment'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware]);
