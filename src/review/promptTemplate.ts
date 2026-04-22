import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

import type { PromptType } from '@/types/PromptType';

const templateCache = new Map<PromptType, string>();

const templateFileByType: Record<PromptType, string> = {
    v2think: 'review-v2think.md',
};

function getTemplateDirectory(): string {
    const candidates = [
        // runtime in extension package: out/extension.js -> ../media/prompts
        path.resolve(__dirname, '../media/prompts'),
        // runtime in tests/dev from src/review/*.ts -> ../../media/prompts
        path.resolve(__dirname, '../../media/prompts'),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error('Prompt template directory not found');
}

function loadTemplate(promptType: PromptType): string {
    const cached = templateCache.get(promptType);
    if (cached) {
        return cached;
    }

    const templatePath = path.join(
        getTemplateDirectory(),
        templateFileByType[promptType]
    );
    const template = readFileSync(templatePath, 'utf8');
    templateCache.set(promptType, template);
    return template;
}

export function renderPromptTemplate(
    promptType: PromptType,
    replacements: Record<string, string>
): string {
    let template = loadTemplate(promptType);

    for (const [key, value] of Object.entries(replacements)) {
        template = template.split(`{{${key}}}`).join(value);
    }

    return template.trim();
}
