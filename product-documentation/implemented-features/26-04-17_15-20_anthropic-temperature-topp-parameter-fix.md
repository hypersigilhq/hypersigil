# Anthropic Temperature/Top-P Parameter Fix

## Overview
Modified the Anthropic provider to avoid setting both `temperature` and `top_p` parameters simultaneously in API requests, as these control similar aspects of randomness and Anthropic recommends using only one.

## Changes Made
- Updated `backend/src/providers/anthropic-provider.ts` execute method
- Changed parameter assignment logic from always setting both with defaults to conditional assignment
- Priority logic: temperature > top_p > default temperature (0.9)

## Technical Details
- If `options.temperature` is provided: uses it, omits `top_p`
- If `options.topP` is provided: uses it, omits `temperature`
- If neither provided: sets `temperature: 0.9`, omits `top_p`

## Benefits
- Improved API compliance with Anthropic best practices
- Prevents conflicting randomness parameters
- Maintains backward compatibility for existing usage
- Cleaner, more predictable behavior

## Impact
- No breaking changes to existing API
- Better alignment with Anthropic's parameter recommendations
- Improved execution reliability