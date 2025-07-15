<template>
    <div class="text-commentable">
        <div class="stats-bar">
            <div class="stats-item">
                <span>Comments</span>
                <span class="stats-badge">{{ comments.length }}</span>
            </div>
            <div class="stats-item">
                <span>Total Characters</span>
                <span class="stats-badge">{{ originalContent.length }}</span>
            </div>
        </div>

        <div class="text-commentable-content">
            <div class="text-content">
                <div ref="textElement" @mouseup="handleTextSelection" @selectstart="hideTooltip"
                    @click="handleHighlightClick" class="commentable-wrapper">
                    <slot :rendered-content="renderedContent" :content-class="contentClass">
                        <div v-html="renderedContent" :class="contentClass"></div>
                    </slot>
                </div>
            </div>

            <div class="comments-sidebar">
                <div :class="['comment-form', { hidden: !showCommentForm }]">
                    <div class="selected-text-preview">
                        {{ currentSelection?.text || '' }}
                    </div>
                    <textarea v-model="commentText" placeholder="Add your comment..." @keydown.esc="cancelComment"
                        @keydown.ctrl.enter="saveComment" ref="commentTextarea"></textarea>
                    <div class="comment-form-actions">
                        <button class="btn btn-primary" @click="saveComment" :disabled="!commentText.trim()">
                            💬 Save Comment
                        </button>
                        <button class="btn btn-secondary" @click="cancelComment">
                            ❌ Cancel
                        </button>
                    </div>
                </div>

                <div v-if="comments.length === 0" class="no-comments">
                    🎯 Select text to add your first comment
                </div>

                <div v-else>
                    <div v-for="comment in comments" :key="comment.id"
                        :class="['comment-item', { active: activeCommentId === comment.id }]"
                        :data-comment-id="comment.id" @click="scrollToHighlight(comment.id)"
                        @mouseenter="highlightComment(comment.id)" @mouseleave="unhighlightComment(comment.id)">
                        <div class="comment-preview">
                            "{{ comment.selectedText }}"
                        </div>
                        <div class="comment-text">
                            {{ comment.text }}
                        </div>
                        <div class="comment-meta">
                            <span>{{ comment.timestamp }}</span>
                            <span class="comment-id">#{{ comment.id }}</span>
                        </div>
                        <div class="comment-actions">
                            <button class="btn btn-danger" @click.stop="deleteComment(comment.id)">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showTooltip" class="selection-tooltip" :style="tooltipStyle" @click="openCommentForm">
            💬 Add Comment
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

interface Comment {
    id: number;
    text: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    timestamp: string;
}

interface Selection {
    text: string;
    startOffset: number;
    endOffset: number;
}

interface Props {
    content: string;
    contentClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
    contentClass: 'whitespace-pre-wrap text-sm h-full overflow-auto'
});

// Composables
const useTextSelection = () => {
    const currentSelection = ref<Selection | null>(null);
    const showTooltip = ref(false);
    const tooltipPosition = ref({ x: 0, y: 0 });

    const captureSelection = (textElement: HTMLElement) => {
        const selection = window.getSelection();

        if (!selection) {
            return null;
        }

        if (selection.rangeCount === 0 || selection.toString().trim() === '') {
            hideTooltip();
            return null;
        }

        const range = selection.getRangeAt(0);

        if (!textElement.contains(range.commonAncestorContainer)) {
            return null;
        }

        const plainText = textElement.textContent || textElement.innerText;
        const selectedText = selection.toString();

        const selectionStart = plainText.indexOf(selectedText);
        const selectionEnd = selectionStart + selectedText.length;

        return {
            text: selectedText,
            startOffset: selectionStart,
            endOffset: selectionEnd
        };
    };

    const showTooltipAt = (x: number, y: number) => {
        tooltipPosition.value = { x, y };
        showTooltip.value = true;
    };

    const hideTooltip = () => {
        showTooltip.value = false;
    };

    return {
        currentSelection,
        showTooltip,
        tooltipPosition,
        captureSelection,
        showTooltipAt,
        hideTooltip
    };
};

const useComments = () => {
    const comments = ref<Comment[]>([]);
    const nextCommentId = ref(1);

    const addComment = (selection: Selection, commentText: string) => {
        if (!selection || !commentText.trim()) return null;

        const comment: Comment = {
            id: nextCommentId.value++,
            text: commentText.trim(),
            selectedText: selection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
            timestamp: new Date().toLocaleString()
        };

        comments.value.push(comment);
        return comment;
    };

    const deleteComment = (commentId: number) => {
        comments.value = comments.value.filter(c => c.id !== commentId);
    };

    const getCommentById = (commentId: number) => {
        return comments.value.find(c => c.id === commentId);
    };

    return {
        comments,
        addComment,
        deleteComment,
        getCommentById
    };
};

const useHighlights = (comments: any, originalContent: any) => {
    const activeHighlightId = ref<number | null>(null);

    const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const renderedContent = computed(() => {
        if (!originalContent.value) {
            return escapeHtml(originalContent.value);
        }

        if (comments.value.length === 0) {
            return escapeHtml(originalContent.value);
        }

        // Create an array of characters with their comment associations
        const chars = originalContent.value.split('');
        const charComments: number[][] = new Array(chars.length).fill(null).map(() => []);

        // Mark which characters belong to which comments
        comments.value.forEach((comment: Comment) => {
            for (let i = comment.startOffset; i < comment.endOffset; i++) {
                if (i < charComments.length) {
                    charComments[i].push(comment.id);
                }
            }
        });

        // Build the result by processing each character
        let result = '';
        let currentCommentIds: number[] = [];

        for (let i = 0; i < chars.length; i++) {
            const newCommentIds = charComments[i];

            // Check if comment set has changed
            const commentSetChanged = !arraysEqual(currentCommentIds, newCommentIds);

            if (commentSetChanged) {
                // Close any open spans
                for (let j = currentCommentIds.length - 1; j >= 0; j--) {
                    result += '</span>';
                }

                // Open new spans (innermost first for proper nesting)
                const sortedNewIds = [...newCommentIds].sort((a, b) => {
                    const commentA = comments.value.find((c: Comment) => c.id === a);
                    const commentB = comments.value.find((c: Comment) => c.id === b);
                    if (!commentA || !commentB) return 0;
                    // Sort by range size (smaller ranges nested inside larger ones)
                    const sizeA = commentA.endOffset - commentA.startOffset;
                    const sizeB = commentB.endOffset - commentB.startOffset;
                    return sizeB - sizeA;
                });

                sortedNewIds.forEach(commentId => {
                    result += `<span class="highlight" data-comment-id="${commentId}">`;
                });

                currentCommentIds = newCommentIds;
            }

            // Add the escaped character
            result += escapeHtml(chars[i]);
        }

        // Close any remaining open spans
        for (let j = currentCommentIds.length - 1; j >= 0; j--) {
            result += '</span>';
        }

        return result;
    });

    // Helper function to compare arrays
    const arraysEqual = (a: number[], b: number[]): boolean => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, index) => val === sortedB[index]);
    };

    const activateHighlight = (commentId: number, duration = 2000) => {
        activeHighlightId.value = commentId;
        // setTimeout(() => {
        // activeHighlightId.value = null;
        // }, duration);
    };

    return {
        renderedContent,
        activeHighlightId,
        activateHighlight
    };
};

// Refs
const textElement = ref<HTMLElement | null>(null);
const commentTextarea = ref<HTMLTextAreaElement | null>(null);
const originalContent = ref('');
const showCommentForm = ref(false);
const commentText = ref('');
const activeCommentId = ref<number | null>(null);

// Composables
const {
    currentSelection,
    showTooltip,
    tooltipPosition,
    captureSelection,
    showTooltipAt,
    hideTooltip
} = useTextSelection();

const {
    comments,
    addComment,
    deleteComment,
    getCommentById
} = useComments();

const {
    renderedContent,
    activeHighlightId,
    activateHighlight
} = useHighlights(comments, originalContent);

// Computed
const tooltipStyle = computed(() => ({
    left: tooltipPosition.value.x + 'px',
    top: tooltipPosition.value.y + 'px'
}));

// Methods
const handleTextSelection = (e: MouseEvent) => {
    if (!textElement.value) return;

    const selection = captureSelection(textElement.value);
    if (selection) {
        currentSelection.value = selection;
        showTooltipAt(e.pageX - 60, e.pageY - 50);
    }
};

const openCommentForm = () => {
    showCommentForm.value = true;
    hideTooltip();
    nextTick(() => {
        commentTextarea.value?.focus();
    });
};

const saveComment = () => {
    if (!currentSelection.value || !commentText.value.trim()) return;

    const comment = addComment(currentSelection.value, commentText.value);
    if (comment) {
        cancelComment();
        // Auto-scroll to new comment
        nextTick(() => {
            scrollToComment(comment.id);
        });
    }
};

const cancelComment = () => {
    showCommentForm.value = false;
    commentText.value = '';
    currentSelection.value = null;
    hideTooltip();
    window.getSelection()?.removeAllRanges();
};

const scrollToHighlight = (commentId: number) => {
    const highlightElement = textElement.value?.querySelector(`[data-comment-id="${commentId}"]`);
    if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activateHighlight(commentId);

        // Also highlight the comment in sidebar
        activeCommentId.value = commentId;
        setTimeout(() => {
            activeCommentId.value = null;
        }, 2000);
    }
};

const scrollToComment = (commentId: number) => {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activeCommentId.value = commentId;
        setTimeout(() => {
            activeCommentId.value = null;
        }, 2000);
    }
};

const handleHighlightClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const highlight = target.closest('.highlight') as HTMLElement;
    if (highlight) {
        const commentId = parseInt(highlight.dataset.commentId || '0');
        scrollToComment(commentId);
    }
};

const highlightComment = (commentId: number) => {
    activateHighlight(commentId, 0); // 0 duration means it stays highlighted until unhighlighted
};

const unhighlightComment = (commentId: number) => {
    if (activeHighlightId.value === commentId) {
        activeHighlightId.value = null;
    }
};

const handleClickOutside = (e: MouseEvent) => {
    if (textElement.value && !textElement.value.contains(e.target as Node)) {
        hideTooltip();
    }
};

// Lifecycle
onMounted(() => {
    originalContent.value = props.content;
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

// Watchers
watch(() => props.content, (newContent) => {
    originalContent.value = newContent;
});

watch(activeHighlightId, (newId) => {
    // Update highlight visual state
    const highlights = textElement.value?.querySelectorAll('.highlight');
    highlights?.forEach(highlight => {
        highlight.classList.remove('active');
        if (newId && parseInt((highlight as HTMLElement).dataset.commentId || '0') === newId) {
            highlight.classList.add('active');
        }
    });
});
</script>

<style scoped>
.text-commentable {
    @apply flex flex-col h-full;
}

.stats-bar {
    @apply flex items-center gap-4 p-2 bg-muted/50 border-b text-sm;
}

.stats-item {
    @apply flex items-center gap-2;
}

.stats-badge {
    @apply bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium;
}

.text-commentable-content {
    @apply flex flex-1 min-h-0;
}

.text-content {
    @apply flex-1 p-3 bg-muted rounded-l-md overflow-hidden relative;
}

.comments-sidebar {
    @apply w-80 bg-background border-l p-3 overflow-y-auto;
}

.comment-form {
    @apply mb-4 p-3 bg-muted rounded-md;
}

.comment-form.hidden {
    display: none;
}

.selected-text-preview {
    @apply text-sm text-muted-foreground mb-2 p-2 bg-background rounded italic;
}

.comment-form textarea {
    @apply w-full p-2 border rounded-md resize-none h-20 mb-2;
}

.comment-form-actions {
    @apply flex gap-2;
}

.btn {
    @apply px-3 py-1 rounded-md text-sm font-medium transition-colors;
}

.btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
}

.btn-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
}

.btn-success {
    @apply bg-green-600 text-white hover:bg-green-700;
}

.btn-danger {
    @apply bg-destructive text-destructive-foreground hover:bg-destructive/90;
}

.btn:disabled {
    @apply opacity-50 cursor-not-allowed;
}

.no-comments {
    @apply text-center text-muted-foreground py-8;
}

.comment-item {
    @apply mb-3 p-3 bg-muted rounded-md border transition-all cursor-pointer;
}

.comment-item:hover {
    @apply bg-muted/80 border-primary/50;
}

.comment-item.active {
    @apply border-primary bg-primary/10;
}

.comment-preview {
    @apply text-sm text-muted-foreground mb-2 italic;
}

.comment-text {
    @apply text-sm mb-2;
}

.comment-meta {
    @apply flex justify-between text-xs text-muted-foreground mb-2;
}

.comment-actions {
    @apply flex gap-2;
}

.commentable-wrapper {
    @apply h-full;
}

.selection-tooltip {
    @apply absolute bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-primary/90 transition-colors z-10;
}

:deep(.highlight) {
    @apply bg-yellow-200 cursor-pointer;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0) !important;
    box-sizing: border-box;
}

:deep(.highlight:hover) {
    @apply bg-yellow-300;
}

:deep(.highlight.active) {
    @apply bg-yellow-400;
    border: 1px solid black !important;
    box-sizing: border-box;
}

/* Nested highlights - darker shades for overlapping comments */
:deep(.highlight .highlight) {
    @apply bg-orange-200;
}

:deep(.highlight .highlight:hover) {
    @apply bg-orange-300;
}

:deep(.highlight .highlight .highlight) {
    @apply bg-red-200;
}

:deep(.highlight .highlight .highlight:hover) {
    @apply bg-red-300;
}

:deep(.highlight .highlight .highlight .highlight:hover) {
    @apply bg-red-400;
}

/* Add a subtle border to help distinguish nested highlights */
:deep(.highlight .highlight) {
    /* border: 1px solid rgba(0, 0, 0, 0.1); */
    border-radius: 2px;
}
</style>
