interface Window {
    Autofiller: AutofillerNamespace;
    _currentTheme?: { type: string; name: string };
}

interface PluginLaunchOptions {
    callback?: string;
    code?: string;
}

type AIRequest =
    | { type: 'Actions' }
    | { type: 'Chat'; data: string };

interface AIResponse {
    type?: string;
    text?: string;
    error?: string;
    Actions?: Array<Record<string, unknown>>;
}

interface AIMethod {
    executeMethod(name: 'AI', args: [AIRequest], callback: (result: AIResponse) => void): void;
}

type SetFormValueResult = { error?: string } | undefined;

type GetFormValueResult = string | boolean | null | { value?: string | boolean; error?: string };

interface FormConstraints {
    format?: { type: string; value: string };
    charactersLimit?: number;
    allowedSymbols?: string;
    isComb?: boolean;
    listValues?: string[];
    isEditable?: boolean;
    dateFormat?: string;
}
