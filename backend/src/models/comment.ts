import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';

// Generic comment interface extending BaseDocument
export interface Comment extends BaseDocument {
    text: string;
    data: ExecutionComment | GenericComment;
    execution_id?: string | undefined;
    prompt_id?: string | undefined;
}
// Execution comment interface - extends base comment
export interface GenericComment {
    type: "generic";
}
export interface ExecutionComment {
    type: "execution";
    selected_text: string;
    start_offset: number;
    end_offset: number;
}

// Generic comment model class
export class CommentModel extends Model<Comment> {
    protected tableName = 'comments';

    // Override create to set unixTimestampMs automatically
    public override async create(data: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Promise<Comment> {
        return super.create(data);
    }

    // Override update to update unixTimestampMs when text changes
    public override async update(id: string, data: Partial<Omit<Comment, 'id' | 'created_at'>>): Promise<Comment | null> {
        return super.update(id, data);
    }

}

// Export a singleton instance
export const commentModel = new CommentModel();
