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
type LoaderConstructor = new (loaderContainer: string | HTMLElement, mainWindow: string | HTMLElement, options?: LoaderOptions) => Loader;
type FormUIConstructor = new (formFields: EnrichedFormField[], options?: FormOptions) => FormUI;
