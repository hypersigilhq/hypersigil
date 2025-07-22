declare global {
    type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };
    function Ok<T>(data: T): Result<T, never>;
    function Err<E>(error: E): Result<never, E>;
}

export { };
