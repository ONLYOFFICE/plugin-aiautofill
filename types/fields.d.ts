interface FieldLike {
    type: string;
    isComplex: boolean;
    isRadioGroup: boolean;
    constraints?: FormConstraints;
}

interface FieldHandler {
    id: string;
    isDefault?: boolean;
    match?(field: FieldLike): boolean;
    isSelfSufficient?(field: FormField): boolean;
    enrich?(field: FormField, dataKeys: string | string[] | null, sourceData: unknown): FieldOption[];
    normalizeStored?(field: EnrichedFormField): boolean;
    getTargets?(field: FormField | SelectedField): FieldTarget[];
    apply?(field: SelectedField): Promise<void>;
}

interface AutofillerFieldTypes {
    readonly default: FieldHandler | null;
    register(handler: FieldHandler): FieldHandler;
    resolve(field: FieldLike): FieldHandler | null;
    isSelfSufficient(field: FormField): boolean;
    enrich(field: FormField, dataKeys: string | string[] | null, sourceData: unknown): FieldOption[];
    normalizeStored(field: EnrichedFormField): boolean;
    getTargets(field: FormField | SelectedField): FieldTarget[] | null;
    apply(field: SelectedField): Promise<void>;
}

interface AutofillerFieldTypeContext {
    extractValue(data: unknown, key: string): unknown;
    generateOptions(dataKeys: string | string[], sourceData: unknown, fieldType: string): FieldOption[];
    createOption(value: unknown): FieldOption;
    applyConstraints(options: FieldOption[], field: FormField): FieldOption[];
    isBooleanField(fieldType: string | number): boolean;
    resolveBooleanValue(value: unknown, field: FormField): 'true' | 'false' | null;
    splitValueAcrossBoxes(value: unknown, limits: number[]): string[] | null;
    setValue(internalId: string, value: string | boolean): Promise<void>;
    setDate(internalId: string, value: string): Promise<unknown>;
}

interface AutofillerConstraintsValidator {
    toRegExp(mask: string): RegExp;
    toListItem(value: unknown, listValues: string[]): string | null;
    parseDate(value: unknown): Date | null;
    resolveValueForField(rawValue: unknown, field: FormField): string | null;
    applyFieldConstraints(options: FieldOption[], field: FormField): FieldOption[];
    splitValueAcrossBoxes(value: unknown, limits: number[]): string[] | null;
}

interface AutofillerFieldDetection {
    collectForms(): FormMeta[];
}
