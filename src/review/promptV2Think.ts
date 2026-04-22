import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

import { reasoningTag, responseExample } from './prompt';
import { renderPromptTemplate } from './promptTemplate';

const languageTemplateCache = new Map<string, string>();

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

function loadLanguageTemplate(templateName: string): string {
    const cached = languageTemplateCache.get(templateName);
    if (cached) {
        return cached;
    }

    const templatePath = path.join(getTemplateDirectory(), 'lang', templateName);
    const template = readFileSync(templatePath, 'utf8').trim();
    languageTemplateCache.set(templateName, template);
    return template;
}

function inferChangedExtensionsFromDiff(diff: string): Set<string> {
    const extensions = new Set<string>();
    const filePathMatches = diff.matchAll(/^\+\+\+ b\/([^\n\r]+)$/gm);
    for (const match of filePathMatches) {
        const filePath = match[1].trim().toLowerCase();
        const dotIndex = filePath.lastIndexOf('.');
        if (dotIndex > -1 && dotIndex < filePath.length - 1) {
            extensions.add(filePath.slice(dotIndex));
        }
    }
    return extensions;
}

function buildLanguageSpecificGuidance(diff: string): string {
    const extensions = inferChangedExtensionsFromDiff(diff);
    const sections: string[] = [];

    if (extensions.has('.cs')) {
        sections.push(loadLanguageTemplate('csharp.md'));
    }

    if (
        extensions.has('.jsx') ||
        extensions.has('.tsx') ||
        extensions.has('.js') ||
        extensions.has('.ts')
    ) {
        sections.push(loadLanguageTemplate('react.md'));
    }

    return sections.join('\n\n');
}

export function createReviewPromptV2Think(
    changeDescription: string | undefined,
    diff: string,
    customPrompt: string
): string {
    const customPromptBlock = customPrompt.trim();
    const changeDescriptionBlock = changeDescription?.trim()
        ? `<change_description>\n${changeDescription.trim()}\n</change_description>`
        : '';
    const languageSpecificGuidanceBlock = buildLanguageSpecificGuidance(diff);

    return renderPromptTemplate('v2think', {
        CHANGE_DESCRIPTION_BLOCK: changeDescriptionBlock,
        CUSTOM_PROMPT_BLOCK: customPromptBlock,
        DIFF: diff,
        LANGUAGE_SPECIFIC_GUIDANCE_BLOCK: languageSpecificGuidanceBlock,
        REASONING_TAG: reasoningTag,
        RESPONSE_EXAMPLE: JSON.stringify(responseExample, undefined, 2),
    });
}
