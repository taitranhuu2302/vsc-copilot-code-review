import { describe, expect, it } from 'vitest';

import { createReviewPrompt, reasoningTag } from '@/review/prompt';

const changeDescription = 'Various refactorings';
const diff = 'diff\nhere';
const customPrompt = 'custom prompt';

describe('createReviewPrompt', () => {
    it('creates prompt with custom prompt (default)', () => {
        const prompt = createReviewPrompt(
            changeDescription,
            diff,
            customPrompt
        );

        expect(prompt).toContain(
            'Act as a strict senior software engineer reviewing production code.'
        );
        expect(prompt).toContain(customPrompt);
        expect(prompt).toContain('<git_diff>');
        expect(prompt).toContain(diff);
    });

    it('adds C#/.NET guidance when diff contains .cs files', () => {
        const csDiff = `diff --git a/src/Foo.cs b/src/Foo.cs
+++ b/src/Foo.cs
@@ -1,1 +1,1 @@
-old
+new`;
        const prompt = createReviewPrompt(changeDescription, csDiff, customPrompt);

        expect(prompt).toContain('## C#/.NET focus');
        expect(prompt).toContain('cancellation token propagation');
    });

    it('adds React/frontend guidance when diff contains .tsx files', () => {
        const tsxDiff = `diff --git a/src/App.tsx b/src/App.tsx
+++ b/src/App.tsx
@@ -1,1 +1,1 @@
-old
+new`;
        const prompt = createReviewPrompt(
            changeDescription,
            tsxDiff,
            customPrompt
        );

        expect(prompt).toContain('## React/frontend focus');
        expect(prompt).toContain('dependency arrays');
    });

    it('creates prompt with v2think type', () => {
        const prompt = createReviewPrompt(
            changeDescription,
            diff,
            customPrompt,
            'v2think'
        );

        expect(prompt).toContain('Prompt profile: v2think.');
        expect(prompt).toContain(`<${reasoningTag}>`);
    });
});
