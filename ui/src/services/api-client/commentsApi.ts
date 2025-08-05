import { ApiClient } from 'ts-typed-api/client';
import { type CreateCommentRequest, type CommentListQuery, CommentApiDefinition } from '../definitions/comment';
import { errorHandle } from './error-handle';

export const commentApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    CommentApiDefinition
);

export const commentsApi = {
    create: (body: CreateCommentRequest) => commentApiClient.callApi('comments', 'create', { body }, {
        ...errorHandle,
        201: (payload) => payload.data,
    }),

    list: (options?: { query?: CommentListQuery; }) => commentApiClient.callApi('comments', 'list', options, {
        ...errorHandle,
        200: (payload) => payload.data,
    }),

    delete: (id: string) => {
        commentApiClient.callApi('comments', 'delete', { params: { id } }, {
            ...errorHandle,
            204: (payload) => { },
        });
    }
};
