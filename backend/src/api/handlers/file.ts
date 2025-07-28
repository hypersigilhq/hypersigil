import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { File, fileModel } from '../../models/file';
import { z } from 'zod';
import { FileApiDefinition, FileResponse } from '../definitions/file';

function formatFileForResponse(file: File): FileResponse {
    return {
        id: file.id!,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        data: file.data,
        uploadedBy: file.uploadedBy,
        description: file.description,
        tags: file.tags,
        created_at: (file.created_at instanceof Date ? file.created_at.toISOString() : file.created_at)!,
        updated_at: (file.updated_at instanceof Date ? file.updated_at.toISOString() : file.updated_at)!
    };
}

RegisterHandlers(app, FileApiDefinition, {
    files: {
        selectList: async (req, res) => {
            try {
                const files = await fileModel.findAll();
                const selectList = {
                    items: files
                        .filter(file => file.id)
                        .map(file => ({
                            id: file.id!,
                            name: file.name,
                            originalName: file.originalName,
                            mimeType: file.mimeType,
                            size: file.size,
                            tags: file.tags,
                        })).sort((a, b) => {
                            return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
                        })
                };

                res.respond(200, selectList);
            } catch (error) {
                console.error('Error getting file select list:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve file select list'
                });
            }
        },

        list: async (req, res) => {
            try {
                const { page, limit, search, mimeType, orderBy, orderDirection } = req.query;

                const searchOptions: any = {
                    page: page || 1,
                    limit: limit || 10,
                    orderBy,
                    orderDirection
                };

                if (search) searchOptions.search = search;
                if (mimeType) searchOptions.mimeType = mimeType;

                const result = await fileModel.findWithSearch(searchOptions);

                const formattedResult = {
                    ...result,
                    data: result.data.map(formatFileForResponse)
                };

                res.respond(200, formattedResult);
            } catch (error) {
                console.error('Error listing files:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve files'
                });
            }
        },

        create: async (req, res) => {
            try {
                const createData: any = { ...req.body };

                // Remove undefined values to avoid TypeScript strict optional property issues
                Object.keys(createData).forEach(key => {
                    if (createData[key] === undefined) {
                        delete createData[key];
                    }
                });

                const newFile = await fileModel.create(createData);

                res.respond(201, formatFileForResponse(newFile));
            } catch (error) {
                console.error('Error creating file:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.issues
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create file'
                });
            }
        },

        getById: async (req, res) => {
            try {
                const { id } = req.params;

                const file = await fileModel.findById(id);
                if (!file) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'File not found'
                    });
                }

                res.respond(200, formatFileForResponse(file));
            } catch (error) {
                console.error('Error getting file by ID:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve file'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;

                const deleted = await fileModel.delete(id);
                if (!deleted) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'File not found'
                    });
                }

                res.respond(204, {});
            } catch (error) {
                console.error('Error deleting file:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete file'
                });
            }
        },

        searchByName: async (req, res) => {
            try {
                const { pattern } = req.params;

                const files = await fileModel.searchByName(pattern);
                const formattedFiles = files.map(formatFileForResponse);

                res.respond(200, formattedFiles);
            } catch (error) {
                console.error('Error searching files by name:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to search files'
                });
            }
        },

        download: async (req, res) => {
            try {
                const { id } = req.params;

                const file = await fileModel.findById(id);
                if (!file) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'File not found'
                    });
                }

                // Decode base64 data to buffer
                const fileBuffer = Buffer.from(file.data, 'base64');

                // Set appropriate headers for file download
                res.setHeader('Content-Type', file.mimeType);
                res.setHeader('Content-Length', fileBuffer.length.toString());
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
                res.setHeader('Cache-Control', 'no-cache');

                // Send the file buffer
                res.send(fileBuffer);
            } catch (error) {
                console.error('Error downloading file:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to download file'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
