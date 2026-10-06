interface FieldHandler {
    id: string;
    isDefault?: boolean;
    match?(field: FormField): boolean;
    isSelfSufficient?(field: FormField): boolean;
    enrich?(field: FormField, dataKeys: string | string[] | null, sourceData: unknown): FieldOption[];
    normalizeStored?(field: EnrichedFormField): boolean;
    getTargets?(field: FormField | SelectedField): FieldTarget[];
    apply?(field: SelectedField): Promise<void>;
}

interface AutofillerFieldTypes {
    register(handler: FieldHandler): FieldHandler;
    resolve(field: FormField | SelectedField): FieldHandler | null;
    readonly default: FieldHandler | null;
    enrich(field: FormField, dataKeys: string | string[] | null, sourceData: unknown): FieldOption[];
    apply(field: SelectedField): Promise<void>;
    getTargets(field: FormField | SelectedField): FieldTarget[] | null;
    isSelfSufficient(field: FormField): boolean;
    normalizeStored(field: EnrichedFormField): boolean;
}

interface AutofillerFieldTypeContext {
    extractValue(data: unknown, key: string): unknown;
    generateOptions(dataKeys: string | string[], sourceData: unknown, fieldType: string): FieldOption[];
    applyConstraints(options: FieldOption[], field: FormField): FieldOption[];
    createOption(value: unknown): FieldOption;
    resolveBooleanValue(value: unknown, field: FormField): 'true' | 'false' | null;
    isBooleanField(fieldType: string | number): boolean;
    splitValueAcrossBoxes(value: unknown, limits: number[]): string[] | null;
    setValue(internalId: string, value: string | boolean): Promise<void>;
    setDate(internalId: string, value: string): Promise<unknown>;
}

interface AutofillerConstraintsValidator {
    toRegExp(mask: string): RegExp;
    toListItem(value: unknown, listValues: string[]): string | null;
    parseDate(value: unknown): Date | null;
    resolveValueForField(rawValue: unknown, field: FormField): string | null;
    splitValueAcrossBoxes(value: unknown, limits: number[]): string[] | null;
    applyFieldConstraints(options: FieldOption[], field: FormField): FieldOption[];
}

interface AutofillerFieldDetection {
    collectForms(): FormMeta[];
}
