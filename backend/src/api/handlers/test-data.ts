import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { TestDataApiDefinition } from '../definitions/test-data';
import { TestDataGroup, testDataGroupModel, testDataItemModel, promptModel } from '../../models';
import { promptService } from '../../services/prompt-service';

// Helper function to format test data group for response
const formatTestDataGroupForResponse = (group: any) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    mode: group.mode,
    created_at: group.created_at instanceof Date ? group.created_at.toISOString() : group.created_at,
    updated_at: group.updated_at instanceof Date ? group.updated_at.toISOString() : group.updated_at
});

// Helper function to format test data item for response
const formatTestDataItemForResponse = (item: any) => ({
    id: item.id,
    group_id: item.group_id,
    name: item.name,
    content: item.content,
    created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
    updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at
});

RegisterHandlers(app, TestDataApiDefinition, {
    groups: {
        selectList: async (req, res) => {
            let list = await testDataGroupModel.findAll()

            res.respond(200, {
                items: list.map(e => ({
                    id: e.id!,
                    name: e.name!
                }))
            })
        },
        list: async (req, res) => {
            const { page, limit, search, orderBy, orderDirection } = req.query;

            const result = await testDataGroupModel.findWithSearch({
                page,
                limit,
                search,
                orderBy,
                orderDirection
            });

            const formattedResult = {
                ...result,
                data: result.data.map(formatTestDataGroupForResponse)
            };

            res.respond(200, formattedResult);
        },
        create: async (req, res) => {
            const { name, description, mode } = req.body;

            // Check if group with same name already exists
            const existingGroup = await testDataGroupModel.findByName(name);
            if (existingGroup) {
                res.respond(400, {
                    error: 'Validation error',
                    message: 'A test data group with this name already exists'
                });
                return;
            }

            const groupData: TestDataGroup = { name, mode };
            if (description !== undefined) {
                groupData.description = description;
            }

            const newGroup = await testDataGroupModel.create(groupData);

            res.respond(201, formatTestDataGroupForResponse(newGroup));
        },

        getById: async (req, res) => {
            const { id } = req.params;

            const group = await testDataGroupModel.findById(id);
            if (!group) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            res.respond(200, formatTestDataGroupForResponse(group));
        },

        update: async (req, res) => {
            const { id } = req.params;
            const { name, description } = req.body;

            // Check if group exists
            const existingGroup = await testDataGroupModel.findById(id);
            if (!existingGroup) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            // Check if name is being changed and if new name already exists
            if (name && name !== existingGroup.name) {
                const groupWithSameName = await testDataGroupModel.findByName(name);
                if (groupWithSameName) {
                    res.respond(400, {
                        error: 'Validation error',
                        message: 'A test data group with this name already exists'
                    });
                    return;
                }
            }

            const updateData: any = {};
            if (name !== undefined) {
                updateData.name = name;
            }
            if (description !== undefined) {
                updateData.description = description;
            }

            const updatedGroup = await testDataGroupModel.update(id, updateData);

            if (!updatedGroup) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            res.respond(200, formatTestDataGroupForResponse(updatedGroup));
        },

        delete: async (req, res) => {
            const { id } = req.params;

            // Check if group exists
            const existingGroup = await testDataGroupModel.findById(id);
            if (!existingGroup) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            // Delete all items in the group first (cascade delete)
            await testDataItemModel.deleteByGroupId(id);

            // Delete the group
            const deleted = await testDataGroupModel.delete(id);
            if (!deleted) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            res.respond(204, {});

        },

        listItems: async (req, res) => {
            const { groupId } = req.params;
            const { page, limit, search, orderBy, orderDirection } = req.query;

            // Check if group exists
            const group = await testDataGroupModel.findById(groupId);
            if (!group) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            const result = await testDataItemModel.findByGroupWithSearch({
                groupId,
                page,
                limit,
                search,
                orderBy,
                orderDirection
            });

            const formattedResult = {
                ...result,
                data: result.data.map(formatTestDataItemForResponse)
            };

            res.respond(200, formattedResult);
        },

        createItem: async (req, res) => {
            const { groupId } = req.params;
            const { name, content } = req.body;

            // Check if group exists
            const group = await testDataGroupModel.findById(groupId);
            if (!group) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }

            if (group.mode === 'json') {
                try {
                    JSON.parse(content)
                } catch (e) {
                    res.respond(400, {
                        error: 'Invalid format',
                        message: 'Expected JSON format'
                    });
                    return;
                }
            }

            const itemData: any = {
                group_id: groupId,
                content
            };
            if (name !== undefined) {
                itemData.name = name;
            }

            const newItem = await testDataItemModel.create(itemData);

            res.respond(201, formatTestDataItemForResponse(newItem));
        },

        bulkCreateItems: async (req, res) => {
            const { groupId } = req.params;
            const { items } = req.body;

            // Check if group exists
            const group = await testDataGroupModel.findById(groupId);
            if (!group) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data group not found'
                });
                return;
            }


            if (group.mode === 'json') {
                for (let i of items) {
                    try {
                        JSON.parse(i.content)
                    } catch (e) {
                        res.respond(400, {
                            error: 'Invalid format',
                            message: 'Expected JSON format in: ' + i.name
                        });
                        return;
                    }
                }
            }

            // Add group_id to each item and filter undefined values
            const itemsWithGroupId = items.map(item => {
                const itemData: any = {
                    group_id: groupId,
                    content: item.content
                };
                if (item.name !== undefined) {
                    itemData.name = item.name;
                }
                return itemData;
            });

            const result = await testDataItemModel.bulkCreate(itemsWithGroupId);

            const response = {
                created: result.created.map(formatTestDataItemForResponse),
                errors: result.errors
            };

            res.respond(201, response);
        }
    },

    items: {
        getById: async (req, res) => {
            const { id } = req.params;

            const item = await testDataItemModel.findById(id);
            if (!item) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data item not found'
                });
                return;
            }

            res.respond(200, formatTestDataItemForResponse(item));

        },

        update: async (req, res) => {
            const { id } = req.params;
            const { name, content } = req.body;

            const updateData: any = {};
            if (name !== undefined) {
                updateData.name = name;
            }
            if (content !== undefined) {
                updateData.content = content;
            }

            const updatedItem = await testDataItemModel.update(id, updateData);

            if (!updatedItem) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data item not found'
                });
                return;
            }

            res.respond(200, formatTestDataItemForResponse(updatedItem));

        },

        delete: async (req, res) => {
            const { id } = req.params;

            const deleted = await testDataItemModel.delete(id);
            if (!deleted) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data item not found'
                });
                return;
            }

            res.respond(204, {});
        },

        compilePrompt: async (req, res) => {
            const { promptId, testDataItemId, promptVersion } = req.body;

            // Get the prompt
            const prompt = await promptModel.findById(promptId);
            if (!prompt) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Prompt not found'
                });
                return;
            }

            // Get the test data item
            const testDataItem = await testDataItemModel.findById(testDataItemId);
            if (!testDataItem) {
                res.respond(404, {
                    error: 'Not found',
                    message: 'Test data item not found'
                });
                return;
            }

            // Get the specific prompt version or use current version
            const versionToUse = promptVersion || prompt.current_version;
            const promptVersionData = promptModel.getVersion(prompt, versionToUse);

            if (!promptVersionData) {
                res.respond(404, {
                    error: 'Not found',
                    message: `Prompt version ${versionToUse} not found`
                });
                return;
            }

            const result = promptService.compilePromptVersion(testDataItem, promptVersionData);

            res.respond(200, result);
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
