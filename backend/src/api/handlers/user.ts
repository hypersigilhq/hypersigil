import { RegisterHandlers } from 'ts-typed-api';
import app, { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { UserDocument, userModel, UserModel } from '../../models/user';
import { z } from 'zod';
import { UserApiDefinition, UserSummary } from '../definitions/user';

/**
 * Convert UserDocument to response format with proper date serialization
 */
function formatUserForResponse(user: any) {
    const { auth, ...publicUser } = user; // Remove auth data for security

    return {
        ...publicUser,
        created_at: user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at,
        updated_at: user.updated_at instanceof Date ? user.updated_at.toISOString() : user.updated_at,
        invitation: user.invitation ? {
            ...user.invitation,
            expires_at: user.invitation.expires_at instanceof Date ?
                user.invitation.expires_at.toISOString() : user.invitation.expires_at,
            invited_at: user.invitation.invited_at instanceof Date ?
                user.invitation.invited_at.toISOString() : user.invitation.invited_at
        } : undefined
    };
}

/**
 * Convert UserDocument to UserSummary format for list responses
 */
function formatUserSummaryForResponse(user: UserDocument): UserSummary {
    return {
        id: user.id!,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        last_login: user.auth?.last_login?.toISOString(),
        profile: user.profile ? {
        } : undefined,
        created_at: user.created_at instanceof Date ? user.created_at.toISOString() : '',
        updated_at: user.updated_at instanceof Date ? user.updated_at.toISOString() : ''
    };
}

RegisterHandlers(app, UserApiDefinition, {
    users: {
        list: async (req, res) => {
            try {
                const { page, limit, role, status, search } = req.query;

                // Build where clause for filtering
                const where: any = {};
                if (role) where.role = role;
                if (status) where.status = status;

                let users;
                let total;

                if (search) {
                    // If search is provided, use search functionality
                    const searchResults = await Promise.all([
                        userModel.search('name', search),
                        userModel.search('email', search)
                    ]);

                    // Combine and deduplicate results
                    const allResults = [...searchResults[0], ...searchResults[1]];
                    const uniqueUsers = allResults.filter((user, index, self) =>
                        index === self.findIndex(u => u.id === user.id)
                    );

                    // Apply additional filters
                    const filteredUsers = uniqueUsers.filter(user => {
                        if (role && user.role !== role) return false;
                        if (status && user.status !== status) return false;
                        return true;
                    });

                    total = filteredUsers.length;

                    // Manual pagination for search results
                    const startIndex = ((page || 1) - 1) * (limit || 10);
                    const endIndex = startIndex + (limit || 10);
                    users = filteredUsers.slice(startIndex, endIndex);
                } else {
                    // Use paginated query
                    const result = await userModel.findWithPagination({
                        page: page || 1,
                        limit: limit || 10,
                        where: Object.keys(where).length > 0 ? where : undefined,
                        orderBy: 'created_at',
                        orderDirection: 'DESC'
                    });

                    users = result.data;
                    total = result.total;
                }

                const totalPages = Math.ceil(total / (limit || 10));

                const response = {
                    data: users.map(formatUserSummaryForResponse),
                    total,
                    page: page || 1,
                    limit: limit || 10,
                    totalPages,
                    hasNext: (page || 1) < totalPages,
                    hasPrev: (page || 1) > 1
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error listing users:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve users'
                });
            }
        },

        getById: async (req, res) => {
            try {
                const { id } = req.params;

                const user = await userModel.findById(id);
                if (!user) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'User not found'
                    });
                }

                res.respond(200, formatUserForResponse(user));
            } catch (error) {
                console.error('Error getting user by ID:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve user'
                });
            }
        },

        invite: async (req, res) => {
            try {
                const { email, name, role, profile } = req.body;

                // Check if user with this email already exists
                const existingUser = await userModel.findByEmail(email);
                if (existingUser) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'A user with this email already exists'
                    });
                }

                // For now, use a placeholder invitedBy - in real implementation this would come from auth
                const invitedBy = 'system'; // TODO: Replace with actual authenticated user ID

                const userData: Parameters<typeof userModel.createInvitation>[0] = {
                    email,
                    name,
                    role
                };

                if (profile) {
                    // Filter out undefined values from profile
                    const cleanProfile: any = {};
                    if (profile.timezone !== undefined) cleanProfile.timezone = profile.timezone;

                    if (Object.keys(cleanProfile).length > 0) {
                        userData.profile = cleanProfile;
                    }
                }

                const newUser = await userModel.createInvitation(userData, invitedBy);

                const response = {
                    user: formatUserForResponse(newUser),
                    invitation_token: newUser.invitation?.token || ''
                };

                res.respond(201, response);
            } catch (error) {
                console.error('Error creating user invitation:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create user invitation'
                });
            }
        },

        update: async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;

                const existingUser = await userModel.findById(id);
                if (!existingUser) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'User not found'
                    });
                }

                // Note: Email updates are not supported in the current update schema
                // Email is not included in updateUserBodySchema for security reasons

                // Filter out undefined values
                const filteredUpdateData = Object.fromEntries(
                    Object.entries(updateData).filter(([_, value]) => value !== undefined)
                );

                const updatedUser = await userModel.update(id, filteredUpdateData);
                if (!updatedUser) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'User not found'
                    });
                }

                res.respond(200, formatUserForResponse(updatedUser));
            } catch (error) {
                console.error('Error updating user:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to update user'
                });
            }
        },

        updateProfile: async (req, res) => {
            try {
                const { id } = req.params;
                const profileData = req.body;

                // Filter out undefined values from profile
                const cleanProfileData: any = {};
                if (profileData.timezone !== undefined) cleanProfileData.timezone = profileData.timezone;

                const updatedUser = await userModel.updateProfile(id, cleanProfileData);
                if (!updatedUser) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'User not found'
                    });
                }

                res.respond(200, formatUserForResponse(updatedUser));
            } catch (error) {
                console.error('Error updating user profile:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to update user profile'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;

                const deleted = await userModel.delete(id);
                if (!deleted) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'User not found'
                    });
                }

                res.respond(200, {
                    success: true,
                    message: 'User deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting user:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete user'
                });
            }
        },

        cleanup: async (req, res) => {
            try {
                const deletedCount = await userModel.cleanupExpiredInvitations();

                res.respond(200, {
                    deleted_count: deletedCount,
                    message: `Cleaned up ${deletedCount} expired invitation(s)`
                });
            } catch (error) {
                console.error('Error cleaning up expired invitations:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to cleanup expired invitations'
                });
            }
        },
        me: async (req, res) => {

            let user = await userModel.findById(req.user!.id)

            res.respond(200, {
                email: user!.email,
                name: user!.name,
                role: user!.role
            })
        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof UserApiDefinition>((scopes, endpointInfo) => {
    return endpointInfo.domain === 'users' && endpointInfo.routeKey === 'me'
}), authMiddleware]);
