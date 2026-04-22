import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

import type { Config } from '@/types/Config';
import type { ReviewResult } from '@/types/ReviewResult';
import { UncommittedRef } from '@/types/Ref';

const historyDirectory = '.codeReview';

type SerializableError = {
    name: string;
    message: string;
    stack?: string;
};

export async function appendReviewHistory(
    config: Config,
    result: ReviewResult
): Promise<void> {
    const historyPath = path.join(config.workspaceRoot, historyDirectory);

    await mkdir(historyPath, { recursive: true });

    const entry = {
        createdAt: new Date().toISOString(),
        request: result.request,
        fileComments: result.fileComments,
        errors: result.errors.map(toSerializableError),
    };

    const scopeLabel = toScopeLabel(result);
    const fileName = `review-${toSafeTimestamp(entry.createdAt)}-${scopeLabel}.json`;
    const filePath = path.join(historyPath, fileName);

    await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
}

function toSafeTimestamp(isoTimestamp: string): string {
    return isoTimestamp.replace(/[:.]/g, '-');
}

function toScopeLabel(result: ReviewResult): string {
    const scope = result.request.scope;
    if (scope.isCommitted) {
        return toSafeFileName(`${scope.base}-to-${scope.target}`);
    }

    if (scope.target === UncommittedRef.Staged) {
        return 'staged';
    }
    if (scope.target === UncommittedRef.Unstaged) {
        return 'unstaged';
    }
    return 'uncommitted';
}

function toSafeFileName(value: string): string {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return normalized.length > 80 ? normalized.slice(0, 80) : normalized;
}

function toSerializableError(error: Error): SerializableError {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };
}