import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveProjectCustomPrompt } from '@/review/projectCustomPrompt';

const tempRoots: string[] = [];

async function createTempGitRoot(): Promise<string> {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cr-prompt-'));
    tempRoots.push(tempRoot);
    return tempRoot;
}

afterEach(async () => {
    while (tempRoots.length > 0) {
        const root = tempRoots.pop();
        if (root) {
            await rm(root, { recursive: true, force: true });
        }
    }
});

describe('resolveProjectCustomPrompt', () => {
    it('returns empty string when custom prompt directory does not exist', async () => {
        const gitRoot = await createTempGitRoot();

        const result = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);

        expect(result).toBe('');
    });

    it('loads generic markdown prompt files', async () => {
        const gitRoot = await createTempGitRoot();
        const promptDir = path.join(
            gitRoot,
            '.github',
            'vsc-code-review',
            'prompts'
        );
        await mkdir(promptDir, { recursive: true });
        await writeFile(path.join(promptDir, 'general.md'), 'always check null');

        const result = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);

        expect(result).toContain('always check null');
    });

    it('selects language-specific prompt by extension metadata', async () => {
        const gitRoot = await createTempGitRoot();
        const promptDir = path.join(
            gitRoot,
            '.github',
            'vsc-code-review',
            'prompts'
        );
        await mkdir(promptDir, { recursive: true });
        await writeFile(
            path.join(promptDir, 'dotnet.yml'),
            'language: .cs|.vb\nUse .NET specific guidance.'
        );
        await writeFile(
            path.join(promptDir, 'typescript.md'),
            'language: .ts|.tsx\nUse TypeScript strictness checks.'
        );

        const tsResult = await resolveProjectCustomPrompt(gitRoot, [
            'src/a.ts',
            'src/b.tsx',
        ]);
        const csResult = await resolveProjectCustomPrompt(gitRoot, [
            'src/a.cs',
        ]);

        expect(tsResult).toContain('TypeScript strictness checks.');
        expect(tsResult).not.toContain('.NET specific guidance.');
        expect(csResult).toContain('.NET specific guidance.');
        expect(csResult).not.toContain('TypeScript strictness checks.');
    });

    it('selects language-specific prompt from wrapped metadata block', async () => {
        const gitRoot = await createTempGitRoot();
        const promptDir = path.join(
            gitRoot,
            '.github',
            'vsc-code-review',
            'prompts'
        );
        await mkdir(promptDir, { recursive: true });
        await writeFile(
            path.join(promptDir, 'wrapped.md'),
            '-----\nlangauge: .ts\n-----\nUse wrapped language guidance.'
        );

        const tsResult = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);
        const csResult = await resolveProjectCustomPrompt(gitRoot, ['src/a.cs']);

        expect(tsResult).toContain('Use wrapped language guidance.');
        expect(csResult).not.toContain('Use wrapped language guidance.');
    });

    it('selects language-specific prompt by file name', async () => {
        const gitRoot = await createTempGitRoot();
        const promptDir = path.join(
            gitRoot,
            '.github',
            'vsc-code-review',
            'prompts'
        );
        await mkdir(promptDir, { recursive: true });
        await writeFile(path.join(promptDir, 'ts.md'), 'ts-only rules');
        await writeFile(path.join(promptDir, 'cs.md'), 'cs-only rules');

        const result = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);

        expect(result).toContain('ts-only rules');
        expect(result).not.toContain('cs-only rules');
    });

    it('loads project context from project-context.md', async () => {
        const gitRoot = await createTempGitRoot();
        const configDir = path.join(gitRoot, '.github', 'vsc-code-review');
        const promptDir = path.join(configDir, 'prompts');
        await mkdir(promptDir, { recursive: true });
        await writeFile(
            path.join(configDir, 'project-context.md'),
            'Project context rules'
        );
        await writeFile(path.join(promptDir, 'general.md'), 'Generic rule');

        const result = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);

        expect(result).toContain('Project context rules');
        expect(result).toContain('Generic rule');
    });

    it('falls back to AGENT.md when project-context.md is missing', async () => {
        const gitRoot = await createTempGitRoot();
        const configDir = path.join(gitRoot, '.github', 'vsc-code-review');
        await mkdir(configDir, { recursive: true });
        await writeFile(path.join(configDir, 'AGENT.md'), 'Agent guidance');

        const result = await resolveProjectCustomPrompt(gitRoot, ['src/a.ts']);

        expect(result).toContain('Agent guidance');
    });
});
