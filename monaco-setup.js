// Monaco Editor Setup and Configuration
let monacoEditor = null;

function initializeMonacoEditor() {
    require.config({ 
        paths: { 
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' 
        } 
    });

    require(['vs/editor/editor.main'], function() {
        // Register Lua language with enhanced features
        monaco.languages.register({ id: 'lua' });

        // Define Lua syntax highlighting
        monaco.languages.setMonarchTokensProvider('lua', {
            keywords: [
                'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
                'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true',
                'until', 'while', 'goto'
            ],
            builtins: [
                'assert', 'collectgarbage', 'dofile', 'error', 'getmetatable', 'ipairs',
                'load', 'loadfile', 'next', 'pairs', 'pcall', 'print', 'rawequal', 'rawget',
                'rawset', 'select', 'setmetatable', 'tonumber', 'tostring', 'type', 'xpcall',
                '_G', '_VERSION'
            ],
            robloxAPI: [
                'game', 'workspace', 'script', 'Instance', 'Vector3', 'Vector2', 'CFrame',
                'Color3', 'UDim2', 'UDim', 'Enum', 'wait', 'spawn', 'delay', 'tick', 'warn',
                'GetService', 'FindFirstChild', 'WaitForChild', 'Clone', 'Destroy',
                'Players', 'LocalPlayer', 'Character', 'Humanoid', 'RunService', 'UserInputService',
                'TweenService', 'ReplicatedStorage', 'ServerStorage', 'StarterGui', 'StarterPlayer'
            ],
            operators: [
                '+', '-', '*', '/', '%', '^', '#', '==', '~=', '<=', '>=', '<', '>',
                '=', '(', ')', '{', '}', '[', ']', ';', ':', ',', '.', '..', '...'
            ],
            tokenizer: {
                root: [
                    [/[a-zA-Z_]\w*/, {
                        cases: {
                            '@keywords': 'keyword',
                            '@builtins': 'type.identifier',
                            '@robloxAPI': 'predefined',
                            '@default': 'identifier'
                        }
                    }],
                    [/--\[\[/, 'comment', '@comment'],
                    [/--.*$/, 'comment'],
                    [/"([^"\\]|\\.)*$/, 'string.invalid'],
                    [/'([^'\\]|\\.)*$/, 'string.invalid'],
                    [/"/, 'string', '@string_double'],
                    [/'/, 'string', '@string_single'],
                    [/\[\[/, 'string', '@string_multi'],
                    [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                    [/\d+\.?\d*([eE][\-+]?\d+)?/, 'number'],
                    [/[{}()\[\]]/, '@brackets'],
                    [/[<>]=?|[!=]=?|~=|&&|\|\||[+\-*/%^#]/, 'operator']
                ],
                comment: [
                    [/[^\]]+/, 'comment'],
                    [/\]\]/, 'comment', '@pop'],
                    [/[\]]/, 'comment']
                ],
                string_double: [
                    [/[^\\"]+/, 'string'],
                    [/\\./, 'string.escape'],
                    [/"/, 'string', '@pop']
                ],
                string_single: [
                    [/[^\\']+/, 'string'],
                    [/\\./, 'string.escape'],
                    [/'/, 'string', '@pop']
                ],
                string_multi: [
                    [/[^\]]+/, 'string'],
                    [/\]\]/, 'string', '@pop'],
                    [/[\]]/, 'string']
                ]
            }
        });

        // Configure Lua language features
        monaco.languages.setLanguageConfiguration('lua', {
            comments: {
                lineComment: '--',
                blockComment: ['--[[', ']]']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            indentationRules: {
                increaseIndentPattern: /^.*\b(function|then|do|repeat|else|elseif)\b.*$/,
                decreaseIndentPattern: /^\s*(end|else|elseif|until)\b.*$/
            }
        });

        // Register auto-completion provider
        monaco.languages.registerCompletionItemProvider('lua', {
            provideCompletionItems: function(model, position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = [
                    // Roblox Services
                    {
                        label: 'game:GetService',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'game:GetService("${1:ServiceName}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Get a Roblox service',
                        range: range
                    },
                    {
                        label: 'Players',
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: 'game:GetService("Players")',
                        documentation: 'Players service',
                        range: range
                    },
                    {
                        label: 'LocalPlayer',
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: 'game:GetService("Players").LocalPlayer',
                        documentation: 'Get the local player',
                        range: range
                    },
                    {
                        label: 'workspace',
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: 'workspace',
                        documentation: 'The workspace (game world)',
                        range: range
                    },
                    // Common Functions
                    {
                        label: 'function',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'function ${1:name}(${2:args})\n\t${3:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Function declaration',
                        range: range
                    },
                    {
                        label: 'local function',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'local function ${1:name}(${2:args})\n\t${3:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Local function declaration',
                        range: range
                    },
                    {
                        label: 'for loop',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'for ${1:i} = ${2:1}, ${3:10} do\n\t${4:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop',
                        range: range
                    },
                    {
                        label: 'for pairs',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'for ${1:key}, ${2:value} in pairs(${3:table}) do\n\t${4:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For pairs loop',
                        range: range
                    },
                    {
                        label: 'if statement',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'if ${1:condition} then\n\t${2:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If statement',
                        range: range
                    },
                    {
                        label: 'while loop',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'while ${1:condition} do\n\t${2:-- code}\nend',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'While loop',
                        range: range
                    },
                    // Roblox Common Patterns
                    {
                        label: 'FindFirstChild',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'FindFirstChild("${1:name}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Find first child by name',
                        range: range
                    },
                    {
                        label: 'WaitForChild',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'WaitForChild("${1:name}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Wait for child to exist',
                        range: range
                    },
                    {
                        label: 'Vector3.new',
                        kind: monaco.languages.CompletionItemKind.Constructor,
                        insertText: 'Vector3.new(${1:0}, ${2:0}, ${3:0})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create a new Vector3',
                        range: range
                    },
                    {
                        label: 'CFrame.new',
                        kind: monaco.languages.CompletionItemKind.Constructor,
                        insertText: 'CFrame.new(${1:0}, ${2:0}, ${3:0})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create a new CFrame',
                        range: range
                    },
                    {
                        label: 'Color3.fromRGB',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'Color3.fromRGB(${1:255}, ${2:255}, ${3:255})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create Color3 from RGB values',
                        range: range
                    }
                ];

                return { suggestions: suggestions };
            }
        });

        // Create the editor
        const editorContainer = document.getElementById('scriptEditor');
        if (editorContainer) {
            monacoEditor = monaco.editor.create(editorContainer, {
                value: '',
                language: 'lua',
                theme: 'vs-dark',
                automaticLayout: true,
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                minimap: {
                    enabled: true,
                    side: 'right'
                },
                suggestOnTriggerCharacters: true,
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                parameterHints: {
                    enabled: true
                },
                formatOnPaste: true,
                formatOnType: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoIndent: 'full',
                tabSize: 4,
                insertSpaces: false,
                wordWrap: 'off',
                glyphMargin: false,
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                contextmenu: true,
                mouseWheelZoom: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    useShadows: true
                }
            });

            // Notify that Monaco is ready
            window.monacoEditorReady = true;
            window.dispatchEvent(new Event('monacoReady'));
        }
    });
}

function getMonacoEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : '';
}

function setMonacoEditorValue(value) {
    if (monacoEditor) {
        monacoEditor.setValue(value);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMonacoEditor);
} else {
    initializeMonacoEditor();
}

// Export functions for use in script.js
window.monacoEditorAPI = {
    getEditor: () => monacoEditor,
    getValue: getMonacoEditorValue,
    setValue: setMonacoEditorValue
};
