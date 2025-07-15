export interface Comment {
    id: string;
    text: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    unixTimestampMs: number;
}

export interface Selection {
    text: string;
    startOffset: number;
    endOffset: number;
}

export interface TextCommentableProps {
    content: string;
    contentClass?: string;
    initialComments?: Comment[];
}

export interface TextCommentableEmits {
    commentAdded: [comment: Comment];
    commentDeleted: [commentId: string];
}

// Event payload types for easier consumption
export type CommentAddedEvent = Comment;
export type CommentDeletedEvent = string;
