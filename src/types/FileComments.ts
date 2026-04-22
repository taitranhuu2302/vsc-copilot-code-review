import { ReviewComment } from './ReviewComment';

export type FileComments = {
    target: string; // target file
    comments: ReviewComment[];
    maxSeverity: ReviewComment['severity'];
};
