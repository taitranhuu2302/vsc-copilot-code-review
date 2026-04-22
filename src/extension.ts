import { mkdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { reviewDiff } from '@/review/review';
import { Config } from '@/types/Config';
import { UncommittedRef } from '@/types/Ref';
import { ReviewRequest, ReviewScope } from '@/types/ReviewRequest';
import { ReviewResult } from '@/types/ReviewResult';
import { parseArguments } from '@/utils/parseArguments';
import { passesMinSeverity } from '@/utils/severity';
import { CodeReviewPanel } from '@/vscode/CodeReviewPanel';
import { getConfig, toUri } from '@/vscode/config';
import { ReviewTool } from '@/vscode/ReviewTool';
import { pickCommit, pickRef, pickRefs } from '@/vscode/ui';

let chatParticipant: vscode.ChatParticipant;
let codeReviewPanel: CodeReviewPanel;

// called the first time a command is executed
export function activate(context: vscode.ExtensionContext) {
    chatParticipant = vscode.chat.createChatParticipant(
        'codereview',
        handleChat
    );
    chatParticipant.iconPath = vscode.Uri.joinPath(
        context.extensionUri,
        'images/chat_icon.png'
    );

    // Register the Code Review Panel
    codeReviewPanel = new CodeReviewPanel(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CodeReviewPanel.viewType,
            codeReviewPanel
        )
    );
    context.subscriptions.push(codeReviewPanel);

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.selectChatModel',
            handleSelectChatModel
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeReview.refreshCodeReview', () =>
            codeReviewPanel.refresh()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.createProjectContextPrompt',
            async () => {
                const config = await getConfig();
                const promptRootPath = path.join(
                    config.workspaceRoot,
                    '.github',
                    'vsc-code-review'
                );
                const targetPath = path.join(promptRootPath, 'project-context.md');
                const templateContent = await loadArchitecturePromptTemplate(
                    context.extensionUri
                );
                await mkdir(path.dirname(targetPath), { recursive: true });
                await writeFile(targetPath, templateContent, 'utf8');

                const document = await vscode.workspace.openTextDocument(
                    targetPath
                );
                await vscode.window.showTextDocument(document);
                vscode.window.showInformationMessage(
                    'Created .github/vsc-code-review/project-context.md from architecture prompt template'
                );
            }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.appendArchitecturePromptToProjectContext',
            async () => {
                const config = await getConfig();
                const targetPath = path.join(
                    config.workspaceRoot,
                    '.github',
                    'vsc-code-review',
                    'project-context.md'
                );
                const templateContent = await loadArchitecturePromptTemplate(
                    context.extensionUri
                );
                await mkdir(path.dirname(targetPath), { recursive: true });
                let existing = '';
                try {
                    existing = await readFile(targetPath, 'utf8');
                } catch {
                    // file may not exist yet
                }
                const merged = existing.trim()
                    ? `${existing.trimEnd()}\n\n---\n\n${templateContent}`
                    : templateContent;
                await writeFile(targetPath, merged, 'utf8');
                const document = await vscode.workspace.openTextDocument(
                    targetPath
                );
                await vscode.window.showTextDocument(document);
                vscode.window.showInformationMessage(
                    'Appended architecture prompt template to .github/vsc-code-review/project-context.md'
                );
            }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.generateArchitectureContextWithAI',
            async () => {
                const config = await getConfig();
                const targetPath = path.join(
                    config.workspaceRoot,
                    '.github',
                    'vsc-code-review',
                    'project-context.md'
                );
                const templateContent = await loadArchitecturePromptTemplate(
                    context.extensionUri
                );
                const selectedMode = await vscode.window.showQuickPick(
                    [
                        { label: 'Auto', detail: 'Let AI detect project type' },
                        { label: 'Backend', detail: 'Prioritize backend analysis' },
                        {
                            label: 'Frontend',
                            detail: 'Prioritize frontend analysis',
                        },
                        {
                            label: 'Fullstack',
                            detail: 'Balance backend and frontend analysis',
                        },
                    ],
                    {
                        placeHolder:
                            'Select architecture analysis scope mode',
                    }
                );
                if (!selectedMode) {
                    return;
                }

                const modePrompt = await loadArchitectureModePrompt(
                    context.extensionUri,
                    selectedMode.label
                );
                const promptWithMode = `${templateContent}\n\n${modePrompt}`;

                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Generating architecture context with AI...',
                        cancellable: true,
                    },
                    async (_progress, token) => {
                        const model = await config.getModel();
                        const response = await model.sendRequest(
                            promptWithMode,
                            token
                        );
                        await mkdir(path.dirname(targetPath), {
                            recursive: true,
                        });

                        let existing = '';
                        try {
                            existing = await readFile(targetPath, 'utf8');
                        } catch {
                            // file may not exist yet
                        }

                        const generatedAt = new Date().toISOString();
                        const block = `## AI Architecture Context (${generatedAt})\n\n${response.trim()}\n`;
                        const merged = existing.trim()
                            ? `${existing.trimEnd()}\n\n---\n\n${block}`
                            : block;
                        await writeFile(targetPath, merged, 'utf8');

                        const document = await vscode.workspace.openTextDocument(
                            targetPath
                        );
                        await vscode.window.showTextDocument(document);
                    }
                );

                vscode.window.showInformationMessage(
                    'Generated architecture context and appended to .github/vsc-code-review/project-context.md'
                );
            }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.loadSavedReview',
            async () => {
                const config = await getConfig();
                const reviewDirectory = resolveReviewHistoryDirectory(config);
                const selected = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    defaultUri: vscode.Uri.file(reviewDirectory),
                    filters: { JSON: ['json'] },
                    openLabel: 'Load saved review',
                });
                if (!selected || selected.length === 0) {
                    return;
                }

                try {
                    const raw = await readFile(selected[0].fsPath, 'utf8');
                    const parsed = JSON.parse(raw) as unknown;
                    if (!isReviewResult(parsed)) {
                        throw new Error(
                            'Selected file is not a valid review result JSON.'
                        );
                    }
                    await vscode.commands.executeCommand('workbench.view.scm');
                    await codeReviewPanel.displayChatReviewResults(parsed);
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : 'Unknown error';
                    vscode.window.showErrorMessage(
                        `Failed to load saved review: ${message}`
                    );
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeReview.nextComment', () =>
            codeReviewPanel.navigateToNext()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeReview.previousComment', () =>
            codeReviewPanel.navigateToPrevious()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.openCodeReviewPanel',
            async () => {
                await vscode.commands.executeCommand('workbench.view.scm');
                // Focus on the Code Review section if possible.
                // Some VS Code states may not expose the auto-generated focus command yet.
                try {
                    await vscode.commands.executeCommand(
                        'codeReview.codeReview.focus'
                    );
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : 'Unknown error';
                    const reload = 'Reload Window';
                    const selection = await vscode.window.showWarningMessage(
                        `Opened Source Control, but could not focus the NextG Code Review view automatically. (${message})`,
                        reload
                    );
                    if (selection === reload) {
                        await vscode.commands.executeCommand(
                            'workbench.action.reloadWindow'
                        );
                    }
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.applyCurrentAdjustment',
            async () => {
                try {
                    await codeReviewPanel.applyCurrentCommentAdjustment();
                } catch (error) {
                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : 'Unknown error';
                    vscode.window.showErrorMessage(
                        `Failed to apply current adjustment: ${errorMessage}`
                    );
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'codeReview.applyAdjustment',
            async (...args: unknown[]) => {
                try {
                    console.log(
                        'applyAdjustment command called with args:',
                        args
                    );
                    console.log(
                        'Args details:',
                        args.map(
                            (arg, i) =>
                                `arg${i}: ${typeof arg} = ${String(arg)}`
                        )
                    );

                    let adjustmentData: {
                        filePath: string;
                        originalCode: string;
                        adjustedCode: string;
                        startLine?: number;
                        endLine?: number;
                    };

                    // Handle VS Code command URI with JSON array argument
                    if (
                        args.length === 1 &&
                        Array.isArray(args[0]) &&
                        args[0].length === 1
                    ) {
                        console.log('Using array format (args[0][0])');
                        adjustmentData = args[0][0] as typeof adjustmentData;
                    } else if (
                        args.length === 1 &&
                        typeof args[0] === 'object' &&
                        args[0] !== null
                    ) {
                        console.log('Using single object argument');
                        adjustmentData = args[0] as typeof adjustmentData;
                    } else if (
                        args.length === 1 &&
                        typeof args[0] === 'string'
                    ) {
                        console.log('Using JSON string argument');
                        // JSON string argument (from command URI)
                        const jsonStr = decodeURIComponent(args[0]);
                        console.log('Decoded JSON string:', jsonStr);
                        const parsed = JSON.parse(jsonStr) as unknown;
                        if (
                            Array.isArray(parsed) &&
                            parsed.length === 1 &&
                            isAdjustmentInput(parsed[0])
                        ) {
                            adjustmentData = parsed[0];
                        } else if (isAdjustmentInput(parsed)) {
                            adjustmentData = parsed;
                        } else {
                            throw new Error(
                                'Invalid adjustment payload format in command argument'
                            );
                        }
                    } else if (
                        args.length >= 3 &&
                        typeof args[0] === 'string' &&
                        typeof args[1] === 'string' &&
                        typeof args[2] === 'string'
                    ) {
                        console.log('Using separate string arguments');
                        adjustmentData = {
                            filePath: decodeURIComponent(args[0]),
                            originalCode: decodeURIComponent(args[1]),
                            adjustedCode: decodeURIComponent(args[2]),
                            startLine:
                                args[3] && typeof args[3] === 'string'
                                    ? parseInt(decodeURIComponent(args[3]))
                                    : undefined,
                            endLine:
                                args[4] && typeof args[4] === 'string'
                                    ? parseInt(decodeURIComponent(args[4]))
                                    : undefined,
                        };
                    } else {
                        console.error(
                            'Invalid argument format - all args:',
                            args
                        );
                        throw new Error(
                            `Invalid argument format for applyAdjustment command. Received ${args.length} args of types: ${args.map((arg) => typeof arg).join(', ')}`
                        );
                    }

                    console.log('Final adjustmentData:', adjustmentData);
                    await codeReviewPanel.applyAdjustment(adjustmentData);
                } catch (error) {
                    console.error('Error in applyAdjustment command:', error);
                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : 'Unknown error';
                    vscode.window.showErrorMessage(
                        `Failed to apply adjustment: ${errorMessage}`
                    );
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.lm.registerTool('review', new ReviewTool()),
        vscode.lm.registerTool(
            'reviewStaged',
            new ReviewTool({ defaultTarget: UncommittedRef.Staged })
        ),
        vscode.lm.registerTool(
            'reviewUnstaged',
            new ReviewTool({ defaultTarget: UncommittedRef.Unstaged })
        )
    );
}

function resolveReviewHistoryDirectory(config: Config): string {
    const configured = config.getOptions().reviewHistoryPath.trim();
    if (!configured) {
        return path.join(config.workspaceRoot, '.codeReview');
    }
    return path.isAbsolute(configured)
        ? configured
        : path.join(config.workspaceRoot, configured);
}

async function loadArchitecturePromptTemplate(
    extensionUri: vscode.Uri
): Promise<string> {
    const templatePath = vscode.Uri.joinPath(
        extensionUri,
        'media',
        'prompts',
        'templates',
        'architecture',
        'common.md'
    );
    return await readFile(templatePath.fsPath, 'utf8');
}

async function loadArchitectureModePrompt(
    extensionUri: vscode.Uri,
    modeLabel: string
): Promise<string> {
    const modeFile =
        modeLabel.toLowerCase() === 'backend'
            ? 'backend.md'
            : modeLabel.toLowerCase() === 'frontend'
              ? 'frontend.md'
              : modeLabel.toLowerCase() === 'fullstack'
                ? 'fullstack.md'
                : 'auto.md';

    const modePath = vscode.Uri.joinPath(
        extensionUri,
        'media',
        'prompts',
        'templates',
        'architecture',
        modeFile
    );
    return await readFile(modePath.fsPath, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isReviewResult(value: unknown): value is ReviewResult {
    if (!isRecord(value)) {
        return false;
    }
    if (!Array.isArray(value.fileComments) || !Array.isArray(value.errors)) {
        return false;
    }
    if (!isRecord(value.request) || !isRecord(value.request.scope)) {
        return false;
    }
    return true;
}

function isAdjustmentInput(
    value: unknown
): value is {
    filePath: string;
    originalCode: string;
    adjustedCode: string;
    startLine?: number;
    endLine?: number;
} {
    if (!isRecord(value)) {
        return false;
    }
    return (
        typeof value.filePath === 'string' &&
        typeof value.originalCode === 'string' &&
        typeof value.adjustedCode === 'string' &&
        (value.startLine === undefined || typeof value.startLine === 'number') &&
        (value.endLine === undefined || typeof value.endLine === 'number')
    );
}

export function deactivate() {
    if (chatParticipant) {
        chatParticipant.dispose();
    }
}

async function handleChat(
    chatRequest: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<void> {
    const config = await getConfig();

    if (
        !chatRequest.command ||
        !['review', 'branch', 'commit'].includes(chatRequest.command)
    ) {
        stream.markdown(
            'Please use one of the following commands:\n' +
                ' - `@codeReview /review` to review changes between two branches, commits, or tags. You can specify git refs using e.g. `/review develop main`, or omit the second or both arguments to select refs interactively.\n' +
                ' - `@codeReview /branch` to review changes between two branches\n' +
                ' - `@codeReview /commit` to review changes in a single commit'
        );
        return;
    }

    const reviewRequest = await getReviewRequest(
        config,
        chatRequest.command,
        chatRequest.prompt
    );
    if (!reviewRequest) {
        return;
    }

    if (chatRequest.command === 'commit') {
        stream.markdown(
            `Reviewing changes in commit \`${reviewRequest.scope.target}\`...\n\n`
        );
    } else if (!reviewRequest.scope.isCommitted) {
        const targetLabel =
            reviewRequest.scope.target === UncommittedRef.Staged
                ? 'staged'
                : 'unstaged';
        stream.markdown(`Reviewing ${targetLabel} changes...\n\n`);
    } else {
        const { base, target } = reviewRequest.scope;
        const targetIsBranch = await config.git.isBranch(target);
        stream.markdown(
            `Reviewing changes ${targetIsBranch ? 'on' : 'at'} \`${target}\` compared to \`${base}\`...\n\n`
        );
        if (await config.git.isSameRef(base, target)) {
            stream.markdown('No changes found.');
            return;
        }
    }
    const results = await review(config, reviewRequest, stream, token);

    // Check if there are any problems to show before opening the panel
    const options = config.getOptions();
    const filteredResults = results.fileComments.filter((file) => {
        return file.comments.some(
            (comment) =>
                passesMinSeverity(comment.severity, options.minSeverity) &&
                comment.line > 0
        );
    });

    // Only open Source Control panel and show results if there are actual problems
    if (codeReviewPanel && filteredResults.length > 0) {
        // Open Source Control panel and show results in the Code Review view
        await vscode.commands.executeCommand('workbench.view.scm');

        // Send the results to the Source Control panel
        await codeReviewPanel.displayChatReviewResults(results);

        // Send message to indicate results are available in the Source Control panel with a clickable command
        stream.markdown(
            `\n\n**Review results are also available in the Source Control panel**\n\n`
        );
        stream.button({
            command: 'codeReview.openCodeReviewPanel',
            title: 'Open Code Review Panel',
        });
    }

    showReviewResults(config, results, stream, token);
}

/** Constructs review request (prompting user if needed) */
async function getReviewRequest(
    config: Config,
    command: string,
    prompt: string
): Promise<ReviewRequest | undefined> {
    const parsedPrompt = await parseArguments(config.git, prompt);

    let reviewScope: ReviewScope;
    if (command === 'commit') {
        let commit;
        if (parsedPrompt.target) {
            if (parsedPrompt.base) {
                throw new Error(
                    '/commit expects at most a single ref as argument'
                );
            }
            commit = parsedPrompt.target;
        } else {
            commit = await pickCommit(config);
        }
        if (!commit) {
            return;
        }

        reviewScope = await config.git.getReviewScope(commit);
    } else {
        let refs;
        if (parsedPrompt.target && parsedPrompt.base) {
            // both refs are provided
            refs = parsedPrompt;
        } else if (parsedPrompt.target && !parsedPrompt.base) {
            // only target ref is provided
            const base = await pickRef(
                config,
                'Select a branch/tag/commit to compare with (2/2)',
                parsedPrompt.target
            );
            if (!base) {
                return;
            }
            refs = { target: parsedPrompt.target, base };
        } else if (command === 'review') {
            refs = await pickRefs(config, undefined);
        } else if (command === 'branch') {
            refs = await pickRefs(config, 'branch');
        }

        if (config.git.isValidRefPair(refs)) {
            reviewScope = await config.git.getReviewScope(
                refs.target,
                refs.base
            );
        } else if (
            refs?.target &&
            (await config.git.isInitialCommit(refs.target))
        ) {
            reviewScope = await config.git.getReviewScope(
                refs.target,
                undefined
            );
        } else {
            return;
        }
    }

    return { scope: reviewScope };
}

/** Reviews changes and displays progress bar */
async function review(
    config: Config,
    reviewRequest: ReviewRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
) {
    const progress = {
        lastMessage: '',
        report: ({ message }: { message: string }) => {
            if (message && message !== progress.lastMessage) {
                stream.progress(message);
                progress.lastMessage = message;
            }
        },
    };

    const result = await reviewDiff(config, reviewRequest, progress, token);
    if (token.isCancellationRequested) {
        if (result.fileComments.length > 0) {
            stream.markdown('\nCancelled, showing partial results.');
        } else {
            stream.markdown('\nCancelled.');
        }
    }

    return result;
}

function showReviewResults(
    config: Config,
    result: ReviewResult,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
) {
    const options = config.getOptions();
    const isTargetCheckedOut = result.request.scope.isTargetCheckedOut;
    let noProblemsFound = true;
    for (const file of result.fileComments) {
        if (token.isCancellationRequested) {
            return;
        }

        const filteredFileComments = file.comments.filter(
            (comment) =>
                passesMinSeverity(comment.severity, options.minSeverity) &&
                comment.line > 0
        );

        if (filteredFileComments.length > 0) {
            stream.anchor(toUri(config, file.target));
        }

        for (const comment of filteredFileComments) {
            const isValidLineNumber = isTargetCheckedOut && comment.line > 0;
            const location = isValidLineNumber
                ? new vscode.Location(
                      toUri(config, file.target),
                      new vscode.Position(comment.line - 1, 0)
                  )
                : null;

            stream.markdown(`\n - `);
            if (location) {
                stream.anchor(location);
            } else {
                stream.markdown(`Line ${comment.line}: `);
            }
            if (comment.promptType) {
                stream.markdown(`**${comment.promptType}**: `);
            }
            stream.markdown(
                `${comment.comment} (Severity: ${comment.severity})`
            );
            noProblemsFound = false;
        }

        if (filteredFileComments.length > 0) {
            stream.markdown('\n\n');
        }
    }

    if (noProblemsFound && result.errors.length === 0) {
        stream.markdown('\nNo problems found.');
    } else if (!isTargetCheckedOut) {
        stream.markdown(
            '\nNote: The target branch or commit is not checked out, so line numbers may not match the current state.'
        );
    }

    if (result.errors.length > 0) {
        for (const error of result.errors) {
            config.logger.info('Error: ', error.message, error.stack);
        }

        const errorString = result.errors
            .map((error) => ` - ${error.message}`)
            .join('\n');
        throw new Error(
            `${result.errors.length} error(s) occurred during review:\n${errorString}`
        );
    }
}

async function handleSelectChatModel() {
    const models = await vscode.lm.selectChatModels();
    if (!models || models.length === 0) {
        vscode.window.showWarningMessage('No chat models available.');
        return;
    }

    const config = await getConfig();
    const currentModelId = config.getOptions().chatModel;

    const quickPickItems = models.map((model) => {
        const prefix = model.id === currentModelId ? '$(check)' : '\u2003 '; // em space
        const modelName = model.name ?? model.id;
        return {
            label: prefix + modelName,
            description: model.vendor,
            id: model.id, // Store the actual model.id
            name: modelName,
        };
    });
    const selectedQuickPickItem = await vscode.window.showQuickPick(
        quickPickItems,
        { placeHolder: 'Select a chat model for codeReview reviews' }
    );
    if (selectedQuickPickItem) {
        await vscode.workspace
            .getConfiguration('codeReview')
            .update(
                'chatModel',
                selectedQuickPickItem.id,
                vscode.ConfigurationTarget.Global
            );
        vscode.window.showInformationMessage(
            `codeReview chat model set to: ${selectedQuickPickItem.name}`
        );
    }
}
