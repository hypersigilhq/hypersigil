import { RegisterHandlers } from 'ts-typed-api';
import app, { loggingMiddleware, timingMiddleware } from '../../app';
import { TestDataApiDefinition } from '../definitions/test-data';
import { testDataGroupModel, testDataItemModel } from '../../models';
import { executionService } from '../../services/execution-service';

// Helper function to format test data group for response
const formatTestDataGroupForResponse = (group: any) => ({
    id: group.id,
    name: group.name,
    description: group.description,
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
            try {
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
            } catch (error) {
                console.error('Error listing test data groups:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to list test data groups'
                });
            }
        },

        create: async (req, res) => {
            try {
                const { name, description } = req.body;

                // Check if group with same name already exists
                const existingGroup = await testDataGroupModel.findByName(name);
                if (existingGroup) {
                    res.respond(400, {
                        error: 'Validation error',
                        message: 'A test data group with this name already exists'
                    });
                    return;
                }

                const groupData: any = { name };
                if (description !== undefined) {
                    groupData.description = description;
                }

                const newGroup = await testDataGroupModel.create(groupData);

                res.respond(201, formatTestDataGroupForResponse(newGroup));
            } catch (error) {
                console.error('Error creating test data group:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to create test data group'
                });
            }
        },

        getById: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error getting test data group:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get test data group'
                });
            }
        },

        update: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error updating test data group:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to update test data group'
                });
            }
        },

        delete: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error deleting test data group:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to delete test data group'
                });
            }
        },

        listItems: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error listing test data items:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to list test data items'
                });
            }
        },

        createItem: async (req, res) => {
            try {
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

                const itemData: any = {
                    group_id: groupId,
                    content
                };
                if (name !== undefined) {
                    itemData.name = name;
                }

                const newItem = await testDataItemModel.create(itemData);

                res.respond(201, formatTestDataItemForResponse(newItem));
            } catch (error) {
                console.error('Error creating test data item:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to create test data item'
                });
            }
        },

        bulkCreateItems: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error bulk creating test data items:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to bulk create test data items'
                });
            }
        }
    },

    items: {
        getById: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error getting test data item:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get test data item'
                });
            }
        },

        update: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error updating test data item:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to update test data item'
                });
            }
        },

        delete: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error deleting test data item:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to delete test data item'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware]);
