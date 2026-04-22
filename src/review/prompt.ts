import type { PromptType } from '../types/PromptType';
import { createReviewPromptV2Think } from './promptV2Think';

export const defaultPromptType: PromptType = 'v2think';

export const reasoningTag = 'code_review_process';

export function toPromptTypes(): (PromptType | undefined)[] {
    // Single-prompt mode: always run exactly one prompt.
    return [undefined];
}

export function createReviewPrompt(
    changeDescription: string | undefined,
    diff: string,
    customPrompt: string,
    _promptType?: PromptType
): string {
    void _promptType;
    return createReviewPromptV2Think(changeDescription, diff, customPrompt);
}

export const responseExample = [
    {
        file: 'src/index.html',
        line: 23,
        comment: 'The <script> tag is misspelled as <scirpt>.',
        severity: 4,
        proposedAdjustment: {
            originalCode: '<scirpt src="js/main.js"></scirpt>',
            adjustedCode: '<script src="js/main.js"></script>',
            description: 'Fix the misspelled script tag',
            startLine: 23,
            endLine: 23,
        },
    },
    {
        file: 'src/js/main.js',
        line: 43,
        comment:
            'This method duplicates some of the logic defined in `calculateTotal` inside `src/js/util.js`. Consider refactoring this into a separate helper function to improve readability and reduce duplication.',
        severity: 3,
    },
    {
        file: 'src/js/main.js',
        line: 55,
        comment:
            'Using `eval()` with a possibly user-supplied string may result in code injection.',
        severity: 5,
        proposedAdjustment: {
            originalCode: 'const result = eval(userInput);',
            adjustedCode: 'const result = JSON.parse(userInput);',
            description:
                'Replace eval() with safer JSON.parse() for parsing user input',
            startLine: 55,
            endLine: 55,
        },
    },
];
