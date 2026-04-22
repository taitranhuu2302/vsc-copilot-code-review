import { readdir, readFile } from 'fs/promises';
import * as path from 'path';

import type { Logger } from '@/types/Logger';

type PromptFile = {
    name: string;
    content: string;
    languages: string[];
};

const knownLanguageTokens = new Set([
    'c',
    'cc',
    'cpp',
    'cs',
    'css',
    'go',
    'java',
    'js',
    'jsx',
    'kt',
    'php',
    'py',
    'rb',
    'rs',
    'scala',
    'sh',
    'sql',
    'swift',
    'ts',
    'tsx',
    'vue',
    'xml',
]);

function normalizeExtension(token: string): string {
    const cleaned = token.trim().toLowerCase();
    if (!cleaned) {
        return '';
    }
    return cleaned.startsWith('.') ? cleaned : `.${cleaned}`;
}

function inferLanguagesFromFileName(fileName: string): string[] {
    const lowerName = fileName.toLowerCase();
    const parts = lowerName.split('.');

    // Examples:
    // - "ts.md" => .ts
    // - "prompt.ts.md" => .ts
    if (parts.length >= 2) {
        const candidate = parts[parts.length - 2];
        if (candidate && knownLanguageTokens.has(candidate)) {
            return [normalizeExtension(candidate)];
        }
    }

    return [];
}

function inferLanguagesFromContent(content: string): string[] {
    const wrappedMetadataMatch = content.match(/-{5,}\s*\n([\s\S]*?)\n-{5,}/m);
    const metadataSource = wrappedMetadataMatch?.[1] ?? content;
    const matches = metadataSource.match(/^\s*(language|langauge)\s*:\s*(.+)$/im);
    if (!matches || matches.length < 2) {
        return [];
    }

    return Array.from(
        new Set(
            matches[2]
                .split(/[|,;\s]+/)
                .map((token) => normalizeExtension(token))
                .filter(Boolean)
        )
    );
}

function getChangedExtensions(files: string[]): string[] {
    return Array.from(
        new Set(
            files
                .map((file) => path.extname(file).toLowerCase())
                .filter((ext) => ext.length > 1)
        )
    );
}

function hasLanguageMatch(
    promptLanguages: string[],
    changedExtensions: string[]
): boolean {
    if (promptLanguages.length === 0 || changedExtensions.length === 0) {
        return false;
    }

    return promptLanguages.some((language) =>
        changedExtensions.includes(language)
    );
}

export async function resolveProjectCustomPrompt(
    gitRoot: string,
    changedFiles: string[],
    logger?: Logger
): Promise<string> {
    const configDirectory = path.join(
        gitRoot,
        '.github',
        'vsc-code-review'
    );
    const promptsDirectory = path.join(configDirectory, 'prompts');

    const contextCandidates = [
        path.join(configDirectory, 'project-context.md'),
        path.join(configDirectory, 'AGENT.md'),
        path.join(gitRoot, 'AGENT.md'),
    ];

    let contextPrompt = '';
    for (const candidate of contextCandidates) {
        try {
            const content = (await readFile(candidate, 'utf8')).trim();
            if (content) {
                contextPrompt = content;
                logger?.debug(`Loaded project context from ${candidate}`);
                break;
            }
        } catch {
            // optional file
        }
    }

    let filesInDirectory: string[] = [];
    try {
        filesInDirectory = await readdir(promptsDirectory);
    } catch {
        return contextPrompt;
    }

    const promptFileNames = filesInDirectory
        .filter((name) => /\.(md|ya?ml)$/i.test(name))
        .sort((a, b) => a.localeCompare(b));

    if (promptFileNames.length === 0) {
        return contextPrompt;
    }

    const promptFiles: PromptFile[] = [];
    for (const name of promptFileNames) {
        const filePath = path.join(promptsDirectory, name);
        const content = (await readFile(filePath, 'utf8')).trim();
        if (!content) {
            continue;
        }

        const languages = Array.from(
            new Set([
                ...inferLanguagesFromFileName(name),
                ...inferLanguagesFromContent(content),
            ])
        );

        promptFiles.push({ name, content, languages });
    }

    const changedExtensions = getChangedExtensions(changedFiles);
    const languageSpecificPrompts = promptFiles.filter((file) =>
        hasLanguageMatch(file.languages, changedExtensions)
    );
    const genericPrompts = promptFiles.filter(
        (file) => file.languages.length === 0
    );

    const selectedPrompts = [
        ...(contextPrompt ? [contextPrompt] : []),
        ...genericPrompts.map((file) => file.content),
        ...languageSpecificPrompts.map((file) => file.content),
    ];

    if (selectedPrompts.length === 0) {
        logger?.debug(
            `No custom prompt matched changed file extensions: ${changedExtensions.join(', ')}`
        );
        return '';
    }

    logger?.debug(
        `Loaded ${selectedPrompts.length} project prompt block(s) from ${configDirectory}`
    );
    return selectedPrompts.join('\n\n');
}
