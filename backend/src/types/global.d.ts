declare global {
    type Result<T, E = string> = { success: true; err: false; data: T } | { success: false; err: true; error: E };
    function Ok<T>(data: T): Result<T, never>;
    function Err<E>(error: E): Result<never, E>;
}

export { };
