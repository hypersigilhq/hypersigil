/// <reference path="./global.d.ts" />

// Initialize global Result helper functions
(global as any).Ok = function Ok<T>(data: T): Result<T, never> {
    return { success: true, data };
};

(global as any).Err = function Err<E>(error: E): Result<never, E> {
    return { success: false, error };
};
