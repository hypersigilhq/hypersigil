import { RegisterHandlers } from 'ts-typed-api';
import app, { loggingMiddleware, timingMiddleware, authMiddleware } from '../../app';
import { AuthService } from '../../services/auth-service';
import { UserDocument, UserModel, userModel } from '../../models/user';
import { z } from 'zod';
import { AuthApiDefinition, AuthLoginResponse } from '../definitions/auth';

/**
 * Format user for response (remove sensitive data)
 */
function formatUserForResponse(user: UserDocument): AuthLoginResponse['user'] {
    return {
        email: user.email,
        name: user.name,
        role: user.role
    };
}

RegisterHandlers(app, AuthApiDefinition, {
    auth: {
        registerFirstAdmin: async (req, res) => {
            try {
                const { email, name, password } = req.body;

                // Check if any users already exist
                const hasUsers = await AuthService.hasAnyUsers();
                if (hasUsers) {
                    return res.respond(409, {
                        error: 'Conflict',
                        message: 'Users already exist in the system. First admin registration is not allowed.'
                    });
                }

                // Create the first admin user
                const newUser = await AuthService.createFirstAdmin(email, name, password);
                if (!newUser || !newUser.id) {
                    return res.respond(500, {
                        error: 'Internal Server Error',
                        message: 'Failed to create admin user'
                    });
                }

                // Generate authentication token
                const token = AuthService.generateToken(newUser.id);

                const response = {
                    token,
                    user: formatUserForResponse(newUser)
                };

                res.respond(201, response);
            } catch (error) {
                console.error('Error registering first admin:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                if (error instanceof Error) {
                    if (error.message.includes('already exist')) {
                        return res.respond(409, {
                            error: 'Conflict',
                            message: error.message
                        });
                    }
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to register first admin'
                });
            }
        },

        login: async (req, res) => {
            try {
                const { email, password } = req.body;

                // Authenticate user
                const user = await AuthService.authenticateUser(email, password);

                if (!user || !user.id) {
                    return res.respond(401, {
                        error: 'Unauthorized',
                        message: 'Invalid email or password'
                    });
                }

                // Generate authentication token
                const token = AuthService.generateToken(user.id);
                const response = {
                    token,
                    user: formatUserForResponse(user)
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error during login:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Login failed'
                });
            }
        },

        check: async (req, res) => {
            try {
                // Check if any users exist in the system
                const hasUsers = await AuthService.hasAnyUsers();

                const response = {
                    shouldRedirectToRegisterFirstAdmin: !hasUsers,
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error checking user status:', error);

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to check user status'
                });
            }
        },


        activate: async (req, res) => {
            try {
                const { invitation_token, password } = req.body;

                // Prepare auth data if password is provided
                let authData;
                if (password) {
                    authData = {
                        password_hash: await AuthService.hashPassword(password)
                    };
                }

                const activatedUser = await userModel.activateUser(invitation_token, authData);
                if (!activatedUser) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Invalid or expired invitation token'
                    });
                }

                res.respond(200, formatUserForResponse(activatedUser));
            } catch (error) {
                console.error('Error activating user:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to activate user'
                });
            }
        },
    }
}, [loggingMiddleware, timingMiddleware]);
