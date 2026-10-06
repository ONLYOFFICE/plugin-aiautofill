interface FormMeta {
    InternalId: string;
    Key: string | null;
    Tag: string;
    Label: string;
    Placeholder: string;
    Tip: string;
    Type: string;
    Text: string | boolean;
    Lock: number | null;
    Constraints: FormConstraints;
    IsComplex?: boolean;
    SubFields?: Array<{ InternalId: string; Type: string; Constraints: FormConstraints }>;
    IsRadioGroup?: boolean;
    Choices?: Array<{ Choice: string; InternalId: string }>;
    GroupValue?: string;
}

interface SubField {
    internalId: string;
    type: string;
    charactersLimit: number;
}

interface RadioChoice {
    choice: string;
    internalId: string;
}

interface FormField {
    internalId: string;
    key: string | null;
    tag: string;
    label: string;
    tip: string;
    placeholder: string;
    identifier: string;
    type: string;
    isBoolean: boolean;
    lock: number | null;
    constraints: FormConstraints;
    isComplex: boolean;
    subFields: SubField[];
    isRadioGroup: boolean;
    groupValue: string;
    choices: RadioChoice[];
}

interface FieldOption {
    label: string;
    value: string;
    /** 'ai-mapped' | 'list' | 'validated' | 'no-mapping' */
    source: string;
}

type FieldMapping = Record<string, string | string[]>;

interface EnrichedFormField extends FormField {
    mappedDataKey: string | string[] | null;
    generatedOptions: FieldOption[];
}

interface SelectedField {
    fieldId: string;
    label: string;
    value: string;
    type: string;
    isComplex: boolean;
    subFields: SubField[] | null;
    isRadioGroup: boolean;
    choices: RadioChoice[] | null;
}

interface OriginalValue {
    fieldId: string;
    label: string;
    value: string | boolean;
    type: string;
}

interface FieldTarget {
    internalId: string;
    type?: string;
}
