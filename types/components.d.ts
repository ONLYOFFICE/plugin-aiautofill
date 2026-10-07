type Translate = (text: string) => string;

interface ModalOptions {
    translate?: Translate;
    message?: string | null;
}

interface Modal {
    show(onConfirm?: () => void, onCancel?: () => void, customMessage?: string): PluginWindow | null;
    close(): void;
    getWindow(): PluginWindow | null;
    isShowing(): boolean;
}

interface LoaderOptions {
    translate?: Translate;
    defaultMessage?: string;
}

interface Loader {
    show(message?: string): void;
    hide(): void;
    isShowing(): boolean;
    updateMessage(message?: string): void;
}

interface FormOptions {
    containerSelector?: string;
    selectAllSelector?: string;
}

interface FormUI {
    populateFormFields(): void;
    collectSelectedData(): SelectedField[];
}

type ModalConstructor = new (options?: ModalOptions) => Modal;
type LoaderConstructor = new (loaderContainer: string, mainWindow: string, options?: LoaderOptions) => Loader;
type FormUIConstructor = new (formFields: EnrichedFormField[], options?: FormOptions) => FormUI;

interface ModalInstance extends Modal {
    messages: Record<string, string>;
    options: { translate: Translate; message: string | null };
    window: PluginWindow | null;
    onConfirm: (() => void) | null | undefined;
    onCancel: (() => void) | null | undefined;
    _init(): void;
}

interface LoaderInstance extends Loader {
    options: { translate: Translate; defaultMessage: string };
    loaderElement: HTMLElement | null;
    isVisible: boolean;
    $loaderContainer: JQuery;
    $mainWindow: JQuery;
    _init(): void;
    _removeLoader(): void;
}

interface SelectOptionObject {
    label?: string;
    value?: string;
}

type SelectOption = string | SelectOptionObject;

interface FormTemplates {
    option(option: SelectOption): string;
    options(options: SelectOption[]): string;
    field(field: EnrichedFormField, fieldLabel: string, optionsHTML: string): string;
}

interface FormUIInstance extends FormUI {
    _templates: FormTemplates;
    _options: Required<FormOptions>;
    _formFields: EnrichedFormField[];
    $container: JQuery;
    $selectAll: JQuery;
    _init(): void;
    _initializeSelect(): void;
    _updateApplyButtonState(): void;
    _attachEventListeners(): void;
    _isBooleanFieldType(fieldType: unknown): boolean;
    _validateBooleanFieldOptions(options: SelectOptionObject[]): Array<{ label: string; value: string }>;
}
