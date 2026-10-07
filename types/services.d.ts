interface AutofillerFormService {
    getFieldValue(internalId: string): Promise<string | boolean>;
    setFieldValue(internalId: string, value: string | boolean): Promise<void>;
    setDateValue(internalId: string, value: string): Promise<unknown>;
    restoreFields(fields: OriginalValue[]): Promise<unknown>;
    executeAI(prompt: string): Promise<AIResponse>;
    startBlockingAction(description: string): Promise<void>;
    endBlockingAction(description: string): Promise<void>;
    translate(key: string): string;
}

interface AutofillerFormDetectionService {
    detectAllForms(): Promise<FormField[]>;
    enrichFieldsWithOptions(formFields: FormField[], mapping: FieldMapping, sourceData: unknown): EnrichedFormField[];
    _extractValueFromData(data: unknown, dataKey: string): unknown;
    _generateOptionsFromSingleKey(dataKey: string, sourceData: unknown, fieldType: string): FieldOption[];
    _generateOptionsFromMultipleKeys(dataKeys: string[], sourceData: unknown, fieldType: string): FieldOption[];
    _createOption(value: unknown): FieldOption;
    _isBooleanField(fieldType: string | number): boolean;
    _resolveBooleanValue(value: unknown, field: FormField): 'true' | 'false' | null;
}

interface AutofillerDataExtractor {
    fetch(): Promise<unknown>;
}

type AIContent = string | undefined | { choices?: Array<{ message: { content: string } }> };

interface AutofillerDataMappingService {
    extractAllKeys(data: unknown, prefix?: string, maxDepth?: number, currentDepth?: number): string[];
    parseAIResponse(aiResponse: AIContent): { mapping: FieldMapping; reasoning?: string };
}

interface AutofillerPrompts {
    isGenericIdentifier(name: string): boolean;
    hasMappingContext(field: FormField): boolean;
    filterMeaningfulFields(formFields: FormField[]): FormField[];
    getFieldMappingPrompt(dataKeys: string[], formFields: FormField[]): string;
}

interface AutofillerEditor {
    callMethod<T extends WordMethodName>(name: T, args?: WordMethodArgs[T]): Promise<WordMethodReturn<T>>;
    callCommand(func: () => unknown): Promise<unknown>;
}

interface AutofillerUtils {
    isPluginAvailable(): AscPlugin | undefined;
    getDecodedURLParam(param: string): string | null;
    safeExecute<T>(fn: () => T, errorMsg: string): T | null;
    withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName?: string): Promise<T>;
}
