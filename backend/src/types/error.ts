declare global {
  type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };
  function Ok<T>(data: T): Result<T, never>;
  function Err<E>(error: E): Result<never, E>;
}

// Implement the global functions
global.Ok = function Ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

global.Err = function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}


/** Example:
function parseNumber(input: string): Result<number, string> {
  const num = Number(input);
  if (isNaN(num)) {
    return Err(`Invalid number: ${input}`);
  }
  return Ok(num);
}
 */

export { };
