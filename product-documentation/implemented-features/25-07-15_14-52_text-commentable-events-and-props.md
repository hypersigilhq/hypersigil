25-07-15_14-52

# Text Commentable Component - Events and Props Enhancement

## Overview
Enhanced the TextCommentable component to support external comment management through props and event emits, enabling parent components to control and react to comment operations.

## Features Implemented

### 1. Event Emits
- **commentAdded**: Emitted when a new comment is added
  - Payload: `Comment` object with all comment details
- **commentDeleted**: Emitted when a comment is deleted
  - Payload: `string` (comment ID)

### 2. Props Enhancement
- **initialComments**: Optional prop to provide pre-existing comments
  - Type: `Comment[]`
  - Default: `[]`
  - Supports reactive updates

### 3. TypeScript Support
- Exported TypeScript interfaces for type safety
- Separate types file for reusability
- Index file for convenient imports

## Technical Implementation

### File Structure
```
ui/src/components/ui/text-commentable/
├── TextCommentable.vue     # Main component
├── types.ts               # TypeScript interfaces
└── index.ts              # Export barrel
```

### Key Types
```typescript
interface Comment {
    id: string;
    text: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    timestamp: string;
}

interface TextCommentableProps {
    content: string;
    contentClass?: string;
    initialComments?: Comment[];
}

interface TextCommentableEmits {
    commentAdded: [comment: Comment];
    commentDeleted: [commentId: string];
}
```

### Usage Example
```vue
<template>
    <TextCommentable
        :content="textContent"
        :initial-comments="existingComments"
        @comment-added="handleCommentAdded"
        @comment-deleted="handleCommentDeleted"
    />
</template>

<script setup lang="ts">
import { TextCommentable, type Comment } from '@/components/ui/text-commentable';

const existingComments = ref<Comment[]>([]);

const handleCommentAdded = (comment: Comment) => {
    // Save to backend, update state, etc.
    console.log('New comment:', comment);
};

const handleCommentDeleted = (commentId: string) => {
    // Remove from backend, update state, etc.
    console.log('Deleted comment ID:', commentId);
};
</script>
```

## Benefits

### 1. External State Management
- Parent components can manage comment persistence
- Supports integration with backend APIs
- Enables comment synchronization across components

### 2. Reactive Updates
- Comments can be updated externally via props
- Component automatically re-renders with new data
- Maintains internal state consistency

### 3. Type Safety
- Full TypeScript support for all interfaces
- Compile-time validation of props and events
- Better IDE support and autocomplete

### 4. Reusability
- Component can be used in different contexts
- Flexible comment data source
- Event-driven architecture for loose coupling

## Implementation Details

### Comment Initialization
- Comments are initialized from `initialComments` prop on mount
- Automatic ID management to prevent conflicts
- Deep watching for reactive prop updates

### Event Emission
- Events emitted immediately after internal state changes
- Consistent payload structure for easy handling
- No side effects on component functionality

### Backward Compatibility
- All existing functionality preserved
- Optional props with sensible defaults
- No breaking changes to existing usage

## Future Enhancements
- Comment editing events
- Bulk comment operations
- Comment validation hooks
- Custom comment rendering slots
