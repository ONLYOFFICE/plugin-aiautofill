interface AutofillerFormService {
    setFieldValue(internalId: string, value: string | boolean): Promise<void>;
    setDateValue(internalId: string, value: string): Promise<unknown>;
    getFieldValue(internalId: string): Promise<string | boolean>;
    restoreFields(fields: OriginalValue[]): Promise<unknown>;
    executeAI(prompt: string): Promise<AIResponse>;
    startBlockingAction(description: string): Promise<void>;
    endBlockingAction(description: string): Promise<void>;
    translate(key: string): string;
}

interface AutofillerFormDetectionService {
    _extractValueFromData(data: unknown, dataKey: string): unknown;
    _isBooleanField(fieldType: string | number): boolean;
    _resolveBooleanValue(value: unknown, field: FormField): 'true' | 'false' | null;
    _createOption(value: unknown): FieldOption;
    _generateOptionsFromMultipleKeys(dataKeys: string[], sourceData: unknown, fieldType: string): FieldOption[];
    _generateOptionsFromSingleKey(dataKey: string, sourceData: unknown, fieldType: string): FieldOption[];
    detectAllForms(): Promise<FormField[]>;
    enrichFieldsWithOptions(formFields: FormField[], mapping: FieldMapping, sourceData: unknown): EnrichedFormField[];
}

interface AutofillerDataMappingService {
    extractAllKeys(data: unknown, prefix?: string, maxDepth?: number, currentDepth?: number): string[];
    parseAIResponse(aiResponse: unknown): { mapping: FieldMapping; reasoning?: string };
}

interface AutofillerDataExtractor {
    fetch(): Promise<unknown>;
}

interface AutofillerEditor {
    callMethod(name: string, args?: unknown[]): Promise<unknown>;
    callCommand(func: () => unknown): Promise<unknown>;
}

interface AutofillerPrompts {
    isGenericIdentifier(name: string): boolean;
    hasMappingContext(field: FormField): boolean;
    filterMeaningfulFields(formFields: FormField[]): FormField[];
    getFieldMappingPrompt(dataKeys: string[], formFields: FormField[]): string;
}

interface AutofillerUtils {
    safeExecute<T>(fn: () => T, errorMsg: string): T | null;
    isPluginAvailable(): AscPlugin | undefined;
    getDecodedURLParam(param: string): string | null;
    withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName?: string): Promise<T>;
}
