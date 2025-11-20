(function(window, undefined) {
    const FormService = {
        async setFieldValue(internalId, value) {
            return new Promise((resolve, reject) => {
                if (!window.Autofiller?.Utils?.isPluginAvailable())
                    return reject(new Error('Plugin API not available'));

                window.Asc.plugin.executeMethod('SetFormValue', [internalId, value], (result) => {
                    result?.error 
                        ? reject(new Error(`Failed to set form value for ${internalId}`))
                        : resolve();
                });
            });
        },

        async getFieldValue(internalId) {
            return new Promise((resolve, reject) => {
                if (!window.Autofiller?.Utils?.isPluginAvailable())
                    return reject(new Error('Plugin API not available'));

                window.Asc.plugin.executeMethod('GetFormValue', [internalId], (result) => {
                    if (result?.error)
                        return reject(new Error(`Failed to get form value for ${internalId}`));
                    
                    const value = (typeof result === 'object' && result !== null && 'value' in result) 
                        ? result.value 
                        : result;
                    resolve(value ?? '');
                });
            });
        },

        async executeAI(prompt) {
            const operation = new Promise((resolve, reject) => {
                window.Asc.plugin.executeMethod('AI', [{ type: 'Chat', data: prompt }], (result) => {
                    result?.error ? reject(result.error) : resolve(result);
                });
            });

            return window.Autofiller.Utils.withTimeout(operation, 60000, 'AI Execution');
        },

        async startBlockingAction(description) {
            if (window.Autofiller?.Editor?.callMethod)
                await window.Autofiller.Editor.callMethod('StartAction', ['Block', description]);
        },

        async endBlockingAction(description) {
            if (window.Autofiller?.Editor?.callMethod)
                await window.Autofiller.Editor.callMethod('EndAction', ['Block', description]);
        },

        translate(key) {
            return (window.Autofiller?.Utils?.isPluginAvailable() && window.Asc.plugin.tr)
                ? window.Asc.plugin.tr(key)
                : key;
        }
    };
    
    const FormDetectionService = {
        _isFieldLocked(formMeta) {
            const lockValue = typeof formMeta.Lock === 'number' ? formMeta.Lock : null;
            return lockValue === 0 || lockValue === 1; // FULLY_LOCKED or CONTENT_LOCKED
        },

        _mapFormField(formMeta) {
            const tag = formMeta.Tag || '';
            const key = formMeta.Key || null;
            const identifier = key || tag;
            return {
                internalId: formMeta.InternalId,
                key: key,
                tag: tag,
                identifier: identifier,
                type: formMeta.Type || 'unknown',
                lock: typeof formMeta.Lock === 'number' ? formMeta.Lock : null
            };
        },

        _extractValueFromData(data, dataKey) {
            if (!dataKey || !data)
                return null;

            const keys = dataKey.split('.');
            let value = data;

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                
                if (value === null || value === undefined)
                    return null;
                
                if (Array.isArray(value)) {
                    if (value.length === 0)
                        return null;
                    
                    const remainingKeys = keys.slice(i);
                    const results = value
                        .map(item => this._extractNestedValue(item, remainingKeys))
                        .filter(v => v !== null && v !== undefined);
                    
                    return results.length > 0 ? results : null;
                }
                
                if (value && typeof value === 'object' && key in value)
                    value = value[key];
                else
                    return null;
            }

            return value;
        },

        _extractNestedValue(obj, keys) {
            let current = obj;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current)
                    current = current[key];
                else
                    return null;
            }
            return current;
        },

        _generateFieldOptions(value, fieldType) {
            if (value === null || value === undefined)
                return [];

            if (Array.isArray(value))
                return value
                    .filter(item => item !== null && item !== undefined)
                    .map(item => this._createOption(item));

            if (typeof value === 'object')
                return [this._createOption(JSON.stringify(value))];

            return [this._createOption(value)];
        },

        _createOption(value) {
            const stringValue = String(value);
            return {
                label: stringValue,
                value: stringValue,
                source: 'ai-mapped'
            };
        },

        _enrichField(field, mapping, sourceData) {
            const dataKeys = mapping[field.identifier];
            let generatedOptions = [];

            if (dataKeys)
                generatedOptions = Array.isArray(dataKeys)
                    ? this._generateOptionsFromMultipleKeys(dataKeys, sourceData, field.type)
                    : this._generateOptionsFromSingleKey(dataKeys, sourceData, field.type);

            if (generatedOptions.length === 0)
                generatedOptions = [{
                    label: '',
                    value: '',
                    source: 'no-mapping'
                }];

            return {
                ...field,
                mappedDataKey: dataKeys || null,
                generatedOptions
            };
        },

        _generateOptionsFromMultipleKeys(dataKeys, sourceData, fieldType) {
            const seenValues = new Set();
            const options = [];

            dataKeys.forEach(dataKey => {
                const value = this._extractValueFromData(sourceData, dataKey);
                const keyOptions = this._generateFieldOptions(value, fieldType);
                
                keyOptions.forEach(option => {
                    if (!seenValues.has(option.value)) {
                        seenValues.add(option.value);
                        options.push(option);
                    }
                });
            });

            return options;
        },

        _generateOptionsFromSingleKey(dataKey, sourceData, fieldType) {
            const value = this._extractValueFromData(sourceData, dataKey);
            return this._generateFieldOptions(value, fieldType);
        },

        _hasValidOptions(field) {
            const options = field.generatedOptions || [];
            if (options.length === 0)
                return false;
            
            const firstOption = options[0];
            if (!firstOption)
                return false;
            
            const isEmpty = !firstOption.value || firstOption.value.trim() === '';
            const isNoMapping = firstOption.source === 'no-mapping';
            
            return !(isEmpty || isNoMapping);
        },

        async detectAllForms() {
            return new Promise((resolve, reject) => {
                try {
                    window.Asc.plugin.callCommand(function() {
                        const doc = Api.GetDocument();
                        const forms = doc.GetAllForms();
                        const formData = [];
                        
                        for (let i = 0; i < forms.length; i++) {
                            const form = forms[i];
                            formData.push({
                                InternalId: form.GetInternalId ? form.GetInternalId() : null,
                                Key: form.GetFormKey ? form.GetFormKey() : null,
                                Tag: form.GetTag ? form.GetTag() : '',
                                Placeholder: form.GetPlaceholder ? form.GetPlaceholder() : '',
                                Tip: form.GetTip ? form.GetTip() : '',
                                Type: form.GetFormType ? form.GetFormType() : 'unknown',
                                Text: form.GetText ? form.GetText() : '',
                                Lock: form.IsFixed ? (form.IsFixed() ? 0 : null) : null
                            });
                        }
                        
                        return formData;
                    }, false, true, (formsMeta) => {
                        if (!formsMeta || formsMeta.length === 0)
                            return resolve([]);

                        const formFields = formsMeta
                            .filter(meta => !this._isFieldLocked(meta))
                            .map(meta => this._mapFormField(meta));

                        resolve(formFields);
                    });
                } catch (error) {
                    reject(error);
                }
            });
        },

        enrichFieldsWithOptions(formFields, mapping, sourceData) {
            return formFields
                .map(field => this._enrichField(field, mapping, sourceData))
                .filter(field => this._hasValidOptions(field));
        },
    };

    const FormStateManager = {
        _state: {
            formFieldsData: [],
            originalFormValues: [],
            formUI: null,
            confirmModal: null,
            loader: null
        },

        get formFieldsData() {
            return this._state.formFieldsData;
        },

        set formFieldsData(data) {
            this._state.formFieldsData = data;
        },

        get originalFormValues() {
            return this._state.originalFormValues;
        },

        set originalFormValues(values) {
            this._state.originalFormValues = values;
        },

        get formUI() {
            return this._state.formUI;
        },

        set formUI(ui) {
            this._state.formUI = ui;
        },

        get confirmModal() {
            return this._state.confirmModal;
        },

        set confirmModal(modal) {
            this._state.confirmModal = modal;
        },

        get loader() {
            return this._state.loader;
        },

        set loader(loader) {
            this._state.loader = loader;
        },

        loadFromStorage() {
            const storage = window.Autofiller.StorageManager('autofiller');
            const storedData = storage.pop('form_fields');
            
            if (storedData) {
                this.formFieldsData = storedData;
                return true;
            }
            
            this.formFieldsData = [];
            return false;
        }
    };
    
    const FormOperationsController = {
        async _storeOriginalValues(selectedData) {
            const originalValues = [];

            for (const field of selectedData) {
                try {
                    const currentValue = await window.Autofiller.Utils.withTimeout(
                        FormService.getFieldValue(field.fieldId),
                        2000,
                        'Get field value'
                    );
                    originalValues.push({
                        fieldId: field.fieldId,
                        label: field.label,
                        value: currentValue,
                        type: field.type
                    });
                } catch (error) {
                    originalValues.push({
                        fieldId: field.fieldId,
                        label: field.label,
                        value: '',
                        type: field.type
                    });
                }
            }

            FormStateManager.originalFormValues = originalValues;
            const storage = window.Autofiller.StorageManager('autofiller');
            storage.set('original_data', originalValues);
        },

        async _setFormValues(selectedData) {
            for (const field of selectedData) {
                try {
                    await window.Autofiller.Utils.withTimeout(
                        FormService.setFieldValue(field.fieldId, field.value),
                        2000,
                        `Set field ${field.fieldId}`
                    );
                } catch (error) {
                    console.error(`Error setting field ${field.fieldId}:`, error);
                }
            }
        },

        _showRevertModal() {
            if (this.loader)
                this.loader.show(window.Asc.plugin.tr('Loading...'));
            
            window.location.href = 'revert.html' + (window.Autofiller.getThemeURLParams ? window.Autofiller.getThemeURLParams() : '');
        },

        async _showLoader() {
            if (window.Autofiller?.Editor?.callMethod)
                await FormService.startBlockingAction(window.Asc.plugin.tr('Processing form data'));
            else if (FormStateManager.loader)
                FormStateManager.loader.show(window.Asc.plugin.tr('Processing form data...'));
        },

        async _hideLoader() {
            try {
                if (window.Autofiller?.Editor?.callMethod)
                    await FormService.endBlockingAction(window.Asc.plugin.tr('Processing form data'));
                else if (FormStateManager.loader)
                    FormStateManager.loader.hide();
            } catch (error) {
                if (FormStateManager.loader)
                    FormStateManager.loader.hide();
            }
        },

        _setButtonsEnabled(enabled) {
            const applyButton = document.getElementById('applyBtn');
            const restartButton = document.getElementById('restartBtn');
            const restartBtnEmpty = document.getElementById('restartBtnEmpty');
            
            if (applyButton)
                applyButton.disabled = !enabled;
            if (restartButton)
                restartButton.disabled = !enabled;
            if (restartBtnEmpty)
                restartBtnEmpty.disabled = !enabled;
        },

        _setCheckboxesEnabled(enabled) {
            document.querySelectorAll('.form-fields input[type="checkbox"], #selectAll')
                .forEach(checkbox => checkbox.disabled = !enabled);
        },

        _showConfirmModal(selectedData) {
            const confirmModal = FormStateManager.confirmModal;
            if (!confirmModal)
                return;

            confirmModal.show(
                () => this.applyFormData(selectedData),
                () => this._setButtonsEnabled(true)
            );
        },

        _showBrowserConfirm(selectedData) {
            const confirmed = window.confirm(
                'All data in the document will be replaced with the settings you previously selected.\n' +
                'Are you sure you want to proceed?'
            );
            
            if (confirmed)
                this.applyFormData(selectedData);
            else
                this._setButtonsEnabled(true);
        },

        async applyFormData(selectedData, shouldStoreOriginal = true) {
            try {
                await this._showLoader();
                
                if (shouldStoreOriginal)
                    await this._storeOriginalValues(selectedData);

                await this._setFormValues(selectedData);

                await this._hideLoader();

                if (shouldStoreOriginal)
                    this._showRevertModal();
            } catch (error) {
                try {
                    await this._hideLoader();
                } catch (loaderError) {
                    if (FormStateManager.loader)
                        FormStateManager.loader.hide();
                }
            } finally {
                this._setButtonsEnabled(true);
            }
        },

        async handleApplyRequest() {
            try {
                const selectedData = FormStateManager.formUI.collectSelectedData();
                const storage = window.Autofiller.StorageManager('autofiller');
                storage.set('selected_data', selectedData);

                this._setButtonsEnabled(false);
                this._setCheckboxesEnabled(false);
                await this._showLoader();

                await new Promise(resolve => setTimeout(resolve, 1500));

                await this._hideLoader();

                if (window.Asc?.PluginWindow)
                    this._showConfirmModal(selectedData);
                else
                    this._showBrowserConfirm(selectedData);
            } catch (error) {
                this._setButtonsEnabled(true);
                this._setCheckboxesEnabled(true);
                await this._hideLoader();
            }
        },
    };

    const FormEventBusHandler = {
        _buttonHandler: null,

        _handleMainWindowButton(buttonId) {
            if (buttonId === 'applyBtn' || buttonId === 0)
                return FormOperationsController.handleApplyRequest();
            if (buttonId === 'restartBtn' || buttonId === 1)
                return FormInitializer._handleRestart();
            if (buttonId === 'closeBtn' || buttonId === -1)
                return window.Autofiller.EventBus.closePlugin();
        },

        _handleModalWindowButton(buttonId, windowId) {
            const confirmWindow = FormStateManager.confirmModal?.getWindow();
            if (confirmWindow && windowId === confirmWindow.id) {
                this._handleConfirmModal(buttonId);
                return;
            }

            this._closeUnknownWindow(windowId);
        },


        _handleConfirmModal(buttonId) {
            const isConfirm = (buttonId === 0 || buttonId === '0');

            if (isConfirm) {
                const selectedData = FormStateManager.formUI.collectSelectedData();
                FormOperationsController.applyFormData(selectedData);
            } else {
                FormOperationsController._setButtonsEnabled(true);
            }

            FormStateManager.confirmModal.close();
        },

        _closeUnknownWindow(windowId) {
            if (typeof window.Asc.plugin.executeMethod === 'function' && windowId)
                window.Asc.plugin.executeMethod('CloseWindow', [windowId]);
        },

        initialize() {
            if (!window.Autofiller?.Utils?.isPluginAvailable())
                return;

            this._buttonHandler = ({ id, windowId }) => {
                try {
                    if (windowId === undefined)
                        this._handleMainWindowButton(id);
                    else
                        this._handleModalWindowButton(id, windowId);
                } catch (error) {
                    console.error('Error handling button action:', error);
                }
            };

            window.Autofiller.EventBus.on('button', this._buttonHandler);
        },

        cleanup() {
            if (this._buttonHandler) {
                window.Autofiller.EventBus.off('button', this._buttonHandler);
                this._buttonHandler = null;
            }
        }
    };
    
    const FormInitializer = {
        _attachEventListeners() {
            const applyButton = document.getElementById('applyBtn');
            if (applyButton)
                applyButton.addEventListener('click', () => {
                    FormOperationsController.handleApplyRequest();
                });

            const restartButton = document.getElementById('restartBtn');
            if (restartButton)
                restartButton.addEventListener('click', () => {
                    this._handleRestart();
                });
        },

        async _handleRestart() {
            try {
                FormOperationsController._setButtonsEnabled(false);
                FormOperationsController._setCheckboxesEnabled(false);
                this._showLoader('Restarting AI mapping...');

                const storage = window.Autofiller.StorageManager('autofiller');
                storage.remove('form_fields');
                storage.remove('selected_data');

                await this._redetectAndMapForms();
                FormStateManager.loadFromStorage();

                const hasData = FormStateManager.formFieldsData && FormStateManager.formFieldsData.length > 0;
                
                if (hasData) {
                    this._initializeFormUI();
                    FormStateManager.formUI.populateFormFields();
                }

                this._toggleView(hasData);
                this._hideLoader();
                
                if (hasData) {
                    FormOperationsController._setButtonsEnabled(true);
                    FormOperationsController._setCheckboxesEnabled(true);
                } else {
                    FormOperationsController._setButtonsEnabled(true);
                }
            } catch (error) {
                console.error('Error restarting AI mapping:', error);
                this._hideLoader();
                FormOperationsController._setButtonsEnabled(true);
                FormOperationsController._setCheckboxesEnabled(true);
            }
        },

        _showLoader(message) {
            if (FormStateManager.loader)
                FormStateManager.loader.show(window.Asc.plugin.tr(message));
            else if (window.Autofiller?.Editor?.callMethod)
                FormService.startBlockingAction(window.Asc.plugin.tr(message));
        },

        _hideLoader() {
            if (FormStateManager.loader)
                FormStateManager.loader.hide();
            else if (window.Autofiller?.Editor?.callMethod)
                FormService.endBlockingAction(window.Asc.plugin.tr('Restarting AI mapping'));
        },

        _initializeFormUI() {
            if (!FormStateManager.formUI) {
                FormStateManager.formUI = new window.Autofiller.Form(
                    FormStateManager.formFieldsData, 
                    {
                        containerSelector: '#formFields',
                        selectAllSelector: '#selectAll'
                    }
                );
            }
        },

        async _redetectAndMapForms() {
            const storage = window.Autofiller.StorageManager('autofiller');
            const updateMsg = (msg) => FormStateManager.loader?.updateMessage(window.Asc.plugin.tr(msg));

            updateMsg('Detecting form fields...');
            const formFields = await FormDetectionService.detectAllForms();
            if (!formFields?.length) return this._saveAndReturnEmpty(storage);

            updateMsg('Fetching data...');
            let realData;
            try {
                realData = await window.Autofiller.Utils.withTimeout(
                    window.Autofiller.DataExtractor.fetch(),
                    5000,
                    'Data Fetching'
                );
            } catch (fetchError) {
                if (fetchError.status && fetchError.status >= 500 && fetchError.status < 600)
                    return this._saveAndReturnEmpty(storage);
            }

            if (!realData || (typeof realData === 'object' && Object.keys(realData).length === 0))
                return this._saveAndReturnEmpty(storage);

            updateMsg('Checking AI availability...');
            const isAvailable = await new Promise((resolve) => {
                this._checkAI(() => resolve(true), () => resolve(false), 0);
            });

            if (!isAvailable) {
                throw new Error(window.Asc.plugin.tr('AI is not available. Please ensure AI features are enabled.'));
            }

            updateMsg('Mapping fields with AI...');
            const dataKeys = window.Autofiller.DataMappingService.extractAllKeys(realData);
            const prompt = window.Autofiller.Prompts.getFieldMappingPrompt(dataKeys, formFields);
            const aiResult = await FormService.executeAI(prompt);
            const aiResponse = window.Autofiller.DataMappingService.parseAIResponse(aiResult.text);
            const fieldsWithOptions = FormDetectionService.enrichFieldsWithOptions(formFields, aiResponse.mapping, realData);

            storage.set('form_fields', fieldsWithOptions);
            return fieldsWithOptions;
        },

        _saveAndReturnEmpty(storage) {
            storage.set('form_fields', []);
            return [];
        },

        _checkAI(onSuccess, onError, retryDelay = 1500) {
            const performCheck = () => {
                if (!window.Asc?.plugin?.executeMethod)
                    return false;

                window.Asc.plugin.executeMethod("AI", [{ type: "Actions" }], (data) => {
                    const hasChat = data?.Actions?.some(action => action?.Chat);
                    if (hasChat)
                        if (onSuccess) onSuccess(data);
                    else
                        if (onError) onError({ error: "No Chat action available" });
                });
                return true;
            };

            if (!performCheck() && retryDelay > 0) {
                setTimeout(() => {
                    if (!performCheck() && onError)
                        onError({ error: "Plugin API not available" });
                }, retryDelay);
            }
        },

        _toggleView(showForm) {
            const formContent = document.getElementById('formContent');
            const emptyState = document.getElementById('emptyState');
            
            if (formContent) formContent.style.display = showForm ? 'flex' : 'none';
            if (emptyState) emptyState.style.display = showForm ? 'none' : 'flex';
        },

        initialize() {
            if (typeof window.Autofiller.Loader !== 'undefined') {
                FormStateManager.loader = new window.Autofiller.Loader(
                    '#loaderContainer', 
                    '#mainWindow', 
                    {
                        translate: FormService.translate,
                        defaultMessage: 'Loading...'
                    }
                );
            }

            FormStateManager.loadFromStorage();
            const hasData = FormStateManager.formFieldsData && FormStateManager.formFieldsData.length > 0;

            if (hasData) {
                this._initializeFormUI();
                FormStateManager.confirmModal = new window.Autofiller.ConfirmModal({
                    translate: FormService.translate
                });
                FormStateManager.formUI.populateFormFields();
                this._attachEventListeners();
            } else {
                const restartBtnEmpty = document.getElementById('restartBtnEmpty');
                if (restartBtnEmpty) {
                    restartBtnEmpty.addEventListener('click', () => this._handleRestart());
                }
            }

            this._toggleView(hasData);

            if (window.Autofiller?.Utils?.isPluginAvailable()) {
                FormEventBusHandler.initialize();
            }
            
            if (FormStateManager.loader)
                FormStateManager.loader.hide();
        },
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.FormService = FormService;
    window.Autofiller.FormDetectionService = FormDetectionService;
    
    if (window.Autofiller?.Utils?.isPluginAvailable()) {
        window.Asc.plugin.onThemeChanged = function(theme) {
            window.Asc.plugin.onThemeChangedBase(theme);
            if (typeof updateBodyThemeClasses === 'function') {
                updateBodyThemeClasses(theme.type, theme.name);
            }
            if (typeof updateThemeVariables === 'function') {
                updateThemeVariables(theme);
            }
        };
        
        window.Asc.plugin.init = function() {
            if (window.Asc.plugin.info.theme) {
                window.Asc.plugin.onThemeChanged(window.Asc.plugin.info.theme);
            }
            
            document.documentElement.classList.add('theme-ready');
            
            window.Asc.plugin.attachEvent("onThemeChanged", window.Asc.plugin.onThemeChanged);
        };
    }
    
    if (document.getElementById('formFields')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => FormInitializer.initialize());
        } else {
            FormInitializer.initialize();
        }
    }
})(window, undefined);
