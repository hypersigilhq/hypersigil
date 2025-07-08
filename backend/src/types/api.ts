import { Request, Response } from 'express';

// Base API Response structure
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    timestamp: string;
}

// Error response structure
export interface ApiError {
    success: false;
    error: string;
    message?: string;
    timestamp: string;
    statusCode: number;
}

// Success response structure
export interface ApiSuccess<T = any> {
    success: true;
    data: T;
    message?: string;
    timestamp: string;
}

// Extended Express Request with typed body
export interface TypedRequest<T = any> extends Request {
    body: T;
}

// Extended Express Response with typed JSON method
export interface TypedResponse<T = any> extends Response {
    json(body: ApiResponse<T>): this;
}

// Health check response
export interface HealthCheckResponse {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
}

// User types (example)
export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserRequest {
    name: string;
    email: string;
}

export interface UpdateUserRequest {
    name?: string;
    email?: string;
}

// Pagination types
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
