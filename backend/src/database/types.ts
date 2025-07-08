export interface BaseDocument {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface WhereClause {
    [key: string]: any;
}
