<template>
    <div class="text-commentable">
        <div class="stats-bar">
            <div class="stats-item">
                <span class="text-sm font-medium">Comments</span>
                <Badge variant="default">{{ comments.length }}</Badge>
            </div>
        </div>

        <div class="text-commentable-content">
            <div class="text-content" :style="{ width: `calc(100% - ${sidebarWidth}px)` }">
                <div ref="textElement" @mouseup="handleTextSelection" @selectstart="hideTooltip"
                    @click="handleHighlightClick" class="commentable-wrapper">
                    <slot :rendered-content="renderedContent" :content-class="contentClass">
                        <div v-html="renderedContent" :class="contentClass"></div>
                    </slot>
                </div>
            </div>

            <div class="resize-handle" @mousedown="startResize" :class="{ 'resize-active': isResizing }"></div>

            <div ref="commentsSidebar" class="comments-sidebar" :style="{ width: `${sidebarWidth}px` }">
                <div :class="['comment-form', { hidden: !showCommentForm }]">
                    <div class="selected-text-preview">
                        {{ currentSelection?.text || '' }}
                    </div>
                    <Textarea v-model="commentText" placeholder="Add your comment..." @keydown.esc="cancelComment"
                        @keydown.ctrl.enter="saveComment" ref="commentTextarea" class="min-h-[80px]" />
                    <div class="comment-form-actions">
                        <Button @click="saveComment" :disabled="!commentText.trim()" size="sm">
                            Save Comment
                        </Button>
                        <Button variant="outline" @click="cancelComment" size="sm">
                            Cancel
                        </Button>
                    </div>
                </div>

                <div v-if="comments.length === 0" class="no-comments">
                    Select text to add your first comment
                </div>

                <div v-else class="space-y-3">
                    <div v-for="comment in comments" :key="comment.id"
                        :class="['comment-item', { active: activeCommentId === comment.id }]"
                        :data-comment-id="comment.id" @click="scrollToHighlight(comment.id)"
                        @mouseenter="highlightComment(comment.id)" @mouseleave="unhighlightComment(comment.id)">
                        <!-- <div class="comment-preview">
                            "{{ comment.selectedText }}"
                        </div> -->
                        <div class="comment-text">
                            {{ comment.text }}
                        </div>
                        <div class="comment-meta">
                            <span class="text-[11px] text-muted-foreground">{{ new
                                Date(comment.unixTimestampMs).toLocaleString()
                                }}</span>
                            <Button variant="destructive" size="sm" :class="'text-[12px] h-6'"
                                @click.stop="deleteComment(comment.id)" class="">
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showTooltip" class="selection-tooltip" :style="tooltipStyle" @click="openCommentForm">
            Add Comment
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { Comment, Selection, TextCommentableProps, TextCommentableEmits } from './types'
import { useUI } from "@/services/ui";
import { useSettings } from "@/composables/useSettings";

const ui = useUI()

const props = withDefaults(defineProps<TextCommentableProps>(), {
    contentClass: 'whitespace-pre-wrap text-sm h-full overflow-auto',
    initialComments: () => []
});

const emit = defineEmits<TextCommentableEmits>();

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

function makeid(length: number) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const useComments = () => {
    const comments = ref<Comment[]>([]);
    const nextCommentId = ref(1);

    // Initialize comments from props
    const initializeComments = (initialComments: Comment[]) => {
        comments.value = [...initialComments];
        // Set nextCommentId to be higher than any existing comment ID
    };

    const addComment = (selection: Selection, commentText: string) => {
        if (!selection || !commentText.trim()) return null;

        const comment: Comment = {
            id: makeid(7),
            text: commentText.trim(),
            selectedText: selection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
            unixTimestampMs: new Date().getTime()
        };

        comments.value.push(comment);
        emit('commentAdded', comment)
        return comment;
    };

    const deleteComment = async (commentId: string) => {
        if (await ui.confirm('Confirm deleting the comment')) {
            comments.value = comments.value.filter(c => c.id !== commentId);
            emit('commentDeleted', commentId);
        }
    };

    const getCommentById = (commentId: string) => {
        return comments.value.find(c => c.id === commentId);
    };

    return {
        comments,
        addComment,
        deleteComment,
        getCommentById,
        initializeComments
    };
};

const useHighlights = (comments: any, originalContent: any) => {
    const activeHighlightId = ref<string | null>(null);

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
        const charComments: string[][] = new Array(chars.length).fill(null).map(() => []);

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
        let currentCommentIds: string[] = [];

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
    const arraysEqual = (a: string[], b: string[]): boolean => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, index) => val === sortedB[index]);
    };

    const activateHighlight = (commentId: string, duration = 2000) => {
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
const commentTextarea = ref<any>(null);
const commentsSidebar = ref<HTMLElement | null>(null);
const originalContent = ref('');
const showCommentForm = ref(false);
const commentText = ref('');
const activeCommentId = ref<string | null>(null);

// Resize functionality
const sidebarWidth = useSettings().getSettingRef('executionViewCommentContainerWidth'); // Default width (equivalent to w-80)
const isResizing = ref(false);
const minSidebarWidth = 200;
const maxSidebarWidth = 1600;

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
    getCommentById,
    initializeComments
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
        commentTextarea.value?.$el?.focus();
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

const scrollToHighlight = (commentId: string) => {
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

const scrollToComment = (commentId: string) => {
    if (!commentsSidebar.value) return;

    // Find the comment element within the comments sidebar
    const commentElement = commentsSidebar.value.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
        // Scroll the comment into view within the sidebar container
        commentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });

        // Highlight the comment temporarily
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
        const commentId = highlight.dataset.commentId || '';
        scrollToComment(commentId);
    }
};

const highlightComment = (commentId: string) => {
    activateHighlight(commentId, 0); // 0 duration means it stays highlighted until unhighlighted
};

const unhighlightComment = (commentId: string) => {
    if (activeHighlightId.value === commentId) {
        activeHighlightId.value = null;
    }
};

const handleClickOutside = (e: MouseEvent) => {
    if (textElement.value && !textElement.value.contains(e.target as Node)) {
        hideTooltip();
    }
};

// Resize functionality
const startResize = (e: MouseEvent) => {
    isResizing.value = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth.value;

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.value) return;

        const deltaX = startX - e.clientX;
        const newWidth = Math.max(minSidebarWidth, Math.min(maxSidebarWidth, startWidth + deltaX));
        sidebarWidth.value = newWidth;
    };

    const handleMouseUp = () => {
        isResizing.value = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
};

// Lifecycle
onMounted(() => {
    originalContent.value = props.content;
    initializeComments(props.initialComments);
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

// Watchers
watch(() => props.content, (newContent) => {
    originalContent.value = newContent;
});

watch(() => props.initialComments, (newComments) => {
    initializeComments(newComments);
}, { deep: true });

watch(activeHighlightId, (newId) => {
    // Update highlight visual state
    const highlights = textElement.value?.querySelectorAll('.highlight');
    highlights?.forEach(highlight => {
        highlight.classList.remove('active');
        if (newId && ((highlight as HTMLElement).dataset.commentId || '') === newId) {
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
    @apply flex items-center gap-4 p-3 bg-muted/30 border-b border-border;
}

.stats-item {
    @apply flex items-center gap-2;
}

.text-commentable-content {
    @apply flex flex-1 min-h-0;
}

.text-content {
    @apply flex-1 p-4 bg-card rounded-l-lg overflow-hidden relative border-r;
}

.resize-handle {
    @apply w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors;
    min-width: 4px;
}

.resize-handle.resize-active {
    @apply bg-primary;
}

.comments-sidebar {
    @apply bg-card border-l p-4 overflow-y-auto;
}

.comment-form {
    @apply mb-4 p-4 bg-muted/50 rounded-lg border;
}

.comment-form.hidden {
    display: none;
}

.selected-text-preview {
    @apply text-sm text-muted-foreground mb-3 p-3 bg-background rounded-md italic border;
}

.comment-form-actions {
    @apply flex gap-2 mt-3;
}

.no-comments {
    @apply text-center text-muted-foreground py-8 text-sm;
}

.comment-item {
    @apply p-1 pl-2 bg-muted/30 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 hover:border-primary/30;
}

.comment-item.active {
    @apply border-primary bg-primary/5;
}

.comment-preview {
    @apply text-sm text-muted-foreground mb-2 italic font-medium;
}

.comment-text {
    @apply text-sm leading-relaxed;
}

.comment-meta {
    @apply flex justify-between items-center;
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
    @apply bg-primary/20;
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
