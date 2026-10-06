interface AutofillerNamespace {
    Utils?: AutofillerUtils;
    Editor?: AutofillerEditor;
    Prompts?: AutofillerPrompts;
    EventBus?: AutofillerEventBus;
    StorageManager?: AutofillerStorageManager;
    DataExtractor?: AutofillerDataExtractor;
    DataMappingService?: AutofillerDataMappingService;
    FormService?: AutofillerFormService;
    FormDetectionService?: AutofillerFormDetectionService;
    FieldDetection?: AutofillerFieldDetection;
    FieldTypes?: AutofillerFieldTypes;
    FieldTypeContext?: AutofillerFieldTypeContext;
    ConstraintsValidator?: AutofillerConstraintsValidator;
    getThemeURLParams?: () => string;
    ConfirmModal?: ModalConstructor;
    RevertModal?: ModalConstructor;
    Loader?: LoaderConstructor;
    Form?: FormUIConstructor;
}
