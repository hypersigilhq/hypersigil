import { RegisterHandlers } from 'ts-typed-api';
import app, { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
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
        },

        list: async (req, res) => {
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
        },

        create: async (req, res) => {
            const createData = { ...req.body };
            createData.uploadedBy = req.user?.id

            const newFile = await fileModel.create(createData as any);

            res.respond(201, formatFileForResponse(newFile));
        },

        getById: async (req, res) => {
            const { id } = req.params;

            const file = await fileModel.findById(id);
            if (!file) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'File not found'
                });
            }

            res.respond(200, formatFileForResponse(file));
        },

        delete: async (req, res) => {
            const { id } = req.params;

            const deleted = await fileModel.delete(id);
            if (!deleted) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'File not found'
                });
            }

            res.respond(204, {});
        },

        searchByName: async (req, res) => {
            const { pattern } = req.params;

            const files = await fileModel.searchByName(pattern);
            const formattedFiles = files.map(formatFileForResponse);

            res.respond(200, formattedFiles);
        },

        download: async (req, res) => {
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
        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof FileApiDefinition>((scopes, endpointInfo) => {
    if (endpointInfo.domain !== 'files') {
        return false
    }
    switch (endpointInfo.routeKey) {
        case 'create':
            return scopes.includes('files:upload')
        default:
            return false
    }
}), authMiddleware]);
