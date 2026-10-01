/**
 *
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function (window, undefined) {
    const AIService = {
        UNAVAILABLE: 'AI_UNAVAILABLE',
        FAILED: 'AI_FAILED',

        _LOADING_RE: /no registered ai plugins|plugins manager does not initialized/i,
        _NO_MODEL_RE: /no model|not configured/i,

        _actionsRequest: null,
        _chatRequest: null,

        _buildError(code, message) {
            const error = new Error(message);
            error.code = code;
            return error;
        },

        _requestActions() {
            if (!this._actionsRequest) {
                this._actionsRequest = new Promise((resolve) => {
                    try {
                        window.Asc.plugin.executeMethod('AI', [{ type: 'Actions' }], (data) => resolve({ data }));
                    } catch (e) {
                        resolve({ error: e.message });
                    }
                }).finally(() => {
                    this._actionsRequest = null;
                });
            }

            return this._actionsRequest;
        },

        check(timeout = 5000) {
            if (!window.Asc?.plugin?.executeMethod)
                return Promise.resolve({ available: false, error: 'Plugin API not available' });

            return new Promise((resolve) => {
                const timer = setTimeout(() => resolve({ available: false, pending: true, error: 'AI check timed out' }), timeout);

                this._requestActions().then(({ data, error }) => {
                    clearTimeout(timer);
                    if (error)
                        return resolve({ available: false, error });

                    if (!Array.isArray(data?.Actions)) {
                        const pending = !data?.error || this._LOADING_RE.test(data.error);
                        return resolve({ available: false, pending, error: data?.error || 'Unexpected AI response' });
                    }

                    const hasChat = data.Actions.some(a => a?.Chat);
                    resolve(hasChat ? { available: true, data } : { available: false, error: 'No AI model configured' });
                });
            });
        },

        async ensureAvailable(timeout = 5000) {
            const result = await this.check(timeout);
            if (result.available)
                return;

            const failed = result.pending && !this._LOADING_RE.test(result.error || '');
            throw this._buildError(failed ? this.FAILED : this.UNAVAILABLE, result.error);
        },

        async chat(prompt) {
            if (this._chatRequest)
                throw this._buildError(this.FAILED, 'AI is still busy with a previous request');

            const operation = new Promise((resolve, reject) => {
                // TODO: When there is a flag to disable chain-of-thought, remove the system instruction. For now this solution might help bypass thinking for some models.
                const systemInstruction = "[System: Respond directly. Do not use chain-of-thought, reasoning steps, or <think> tags. Output only the final answer.]\n\n";
                const payload = systemInstruction + prompt;
                window.Asc.plugin.executeMethod('AI', [{ type: 'Chat', data: payload }], (result) => {
                    if (result?.error) {
                        const code = this._NO_MODEL_RE.test(result.error) || this._LOADING_RE.test(result.error)
                            ? this.UNAVAILABLE
                            : this.FAILED;
                        return reject(this._buildError(code, result.error));
                    }

                    if (!result?.text)
                        return reject(this._buildError(this.FAILED, 'AI returned an empty response'));

                    resolve(result);
                });
            });

            this._chatRequest = operation;
            operation.catch(() => {}).finally(() => {
                if (this._chatRequest === operation)
                    this._chatRequest = null;
            });

            try {
                return await window.Autofiller.Utils.withTimeout(operation, 60000, 'AI Execution');
            } catch (error) {
                throw error?.code ? error : this._buildError(this.FAILED, error?.message || String(error));
            }
        },

        watch(onChange, { interval = 1000, startupDeadline = 30000, isPaused = () => false } = {}) {
            const startedAt = Date.now();
            let lastState = null;
            let stopped = false;
            let timer = null;

            const poll = async () => {
                try {
                    if (!isPaused()) {
                        const result = this._actionsRequest
                            ? { available: false, pending: true }
                            : await this.check();
                        let state = result.available;
                        if (result.pending)
                            state = lastState === null && Date.now() - startedAt >= startupDeadline ? false : lastState;

                        if (!stopped && !isPaused() && state !== null && state !== lastState) {
                            lastState = state;
                            onChange(state);
                        }
                    }
                } catch (e) {
                    console.error('AI check error:', e);
                }

                if (!stopped)
                    timer = setTimeout(poll, interval);
            };

            poll();

            return () => {
                stopped = true;
                clearTimeout(timer);
            };
        },
    };

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

        async restoreFields(fields) {
            return new Promise((resolve, reject) => {
                if (!window.Autofiller?.Utils?.isPluginAvailable())
                    return reject(new Error('Plugin API not available'));

                window.Asc.scope = window.Asc.scope || {};
                window.Asc.scope.autofillerRestore = (fields || [])
                    .map((field) => ({ id: field.fieldId, value: field.value }));

                try {
                    window.Asc.plugin.callCommand(function () {
                        var ids = {};
                        (Asc.scope.autofillerRestore || []).forEach(function (entry) {
                            ids[entry.id] = entry.value;
                        });

                        function applyValue(form, value) {
                            if (value == null || (typeof value === 'string' && !value.trim()))
                                return form.Clear && form.Clear();

                            if (form.SetChecked)
                                return form.SetChecked(value === true || String(value).toLowerCase() === 'true');

                            var setters = ['SetValue', 'SetText'];
                            for (var s = 0; s < setters.length; s++) {
                                try {
                                    if (form[setters[s]])
                                        return form[setters[s]](String(value));
                                } catch (e) { }
                            }
                        }

                        function restore(form) {
                            if (!form)
                                return;
                            var id = form.GetInternalId && form.GetInternalId();
                            if (id && ids.hasOwnProperty(id))
                                try {
                                    applyValue(form, ids[id]);
                                } catch (e) { }

                            try {
                                (form.GetSubForms ? form.GetSubForms() || [] : []).forEach(restore);
                            } catch (e) { }
                        }

                        Api.GetDocument().GetAllForms().forEach(restore);
                        return true;
                    }, false, true, resolve);
                } catch (error) {
                    reject(error);
                }
            });
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
            const tip = formMeta.Tip || '';
            const placeholder = formMeta.Placeholder || '';
            const identifier = key || tag || tip || placeholder;
            const type = formMeta.Type || 'unknown';
            return {
                internalId: formMeta.InternalId,
                key: key,
                tag: tag,
                tip: tip,
                placeholder: placeholder,
                identifier: identifier,
                type,
                isBoolean: this._isBooleanField(type),
                lock: typeof formMeta.Lock === 'number' ? formMeta.Lock : null,
                constraints: formMeta.Constraints || {},
                isComplex: !!formMeta.IsComplex,
                subFields: (formMeta.SubFields || []).map(subField => ({
                    internalId: subField.InternalId,
                    type: subField.Type,
                    charactersLimit: (subField.Constraints && typeof subField.Constraints.charactersLimit === 'number')
                        ? subField.Constraints.charactersLimit
                        : -1
                })),
                isRadioGroup: !!formMeta.IsRadioGroup,
                groupValue: formMeta.GroupValue || '',
                choices: (formMeta.Choices || []).map(choice => ({
                    choice: choice.Choice,
                    internalId: choice.InternalId
                }))
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

        _isBooleanField(fieldType) {
            if (fieldType == null) return false;

            if (typeof fieldType === 'string') {
                const t = fieldType.toLowerCase();
                if (t.includes('radiogroup'))
                    return false;

                return t.includes('checkbox') || t.includes('radio');
            }

            if (typeof fieldType === 'number' && window.Asc) {
                if (!this._booleanEnumValues) {
                    const vals = new Set();
                    try {
                        for (const obj of Object.values(window.Asc)) {
                            if (!obj || typeof obj !== 'object') continue;
                            for (const [name, v] of Object.entries(obj)) {
                                if (typeof v !== 'number') continue;
                                const l = name.toLowerCase();
                                if (l.includes('checkbox') || l.includes('radio'))
                                    vals.add(v);
                            }
                        }
                    } catch (_) { }
                    this._booleanEnumValues = vals;
                }
                return this._booleanEnumValues.has(fieldType);
            }

            return false;
        },

        _resolveBooleanValue(value, field) {
            if (typeof value === 'boolean')
                return value ? 'true' : 'false';

            if (typeof value === 'string') {
                const v = value.trim().toLowerCase();
                if (v === 'true' || v === 'false')
                    return v;

                const ids = [field?.key, field?.tag, field?.identifier, field?.tip, field?.placeholder]
                    .filter(Boolean)
                    .map(s => String(s).trim().toLowerCase());

                return ids.length ? (ids.includes(v) ? 'true' : 'false') : null;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    const r = this._resolveBooleanValue(item, field);
                    if (r !== null) return r;
                }
            }

            return null;
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
            const generatedOptions = window.Autofiller.FieldTypes.enrich(field, dataKeys, sourceData);
            return { ...field, mappedDataKey: dataKeys || null, generatedOptions };
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
                    window.Asc.plugin.callCommand(window.Autofiller.FieldDetection.collectForms, false, true, (formsMeta) => {
                        if (!formsMeta || formsMeta.length === 0)
                            return resolve([]);

                        const formFields = formsMeta
                            // .filter(meta => !this._isFieldLocked(meta))
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
                this.formFieldsData = storedData.filter(field => {
                    field.isBoolean = FormDetectionService._isBooleanField(field.type);
                    return window.Autofiller.FieldTypes.normalizeStored(field);
                });
                return true;
            }

            this.formFieldsData = [];
            return false;
        }
    };

    const FormOperationsController = {
        async _storeOriginalValues(selectedData) {
            const originalValues = [];

            const captureValue = async (fieldId, label, type) => {
                try {
                    const currentValue = await window.Autofiller.Utils.withTimeout(
                        FormService.getFieldValue(fieldId),
                        2000,
                        'Get field value'
                    );
                    originalValues.push({ fieldId, label, value: currentValue, type });
                } catch (error) {
                    originalValues.push({ fieldId, label, value: '', type });
                }
            };

            for (const field of selectedData) {
                const targets = window.Autofiller.FieldTypes.getTargets(field);
                if (targets && targets.length) {
                    for (const sub of targets)
                        await captureValue(sub.internalId, field.label, sub.type || 'textForm');
                } else {
                    await captureValue(field.fieldId, field.label, field.type);
                }
            }

            FormStateManager.originalFormValues = originalValues;
            const storage = window.Autofiller.StorageManager('autofiller');
            storage.set('original_data', originalValues);
        },

        async _setFormValues(selectedData) {
            for (const field of selectedData) {
                try {
                    await window.Autofiller.FieldTypes.apply(field);
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

            if (applyButton) {
                if (enabled) {
                    const checkedCount = document.querySelectorAll('.field-checkbox:checked').length;
                    applyButton.disabled = checkedCount === 0;
                } else {
                    applyButton.disabled = true;
                }
            }

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
                this._setCheckboxesEnabled(false);
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
                this._setCheckboxesEnabled(true);
            }
        },

        async handleApplyRequest() {
            try {
                const selectedData = FormStateManager.formUI.collectSelectedData();
                const storage = window.Autofiller.StorageManager('autofiller');
                storage.set('selected_data', selectedData);

                this._setButtonsEnabled(false);

                if (window.Asc?.PluginWindow)
                    this._showConfirmModal(selectedData);
                else
                    this._showBrowserConfirm(selectedData);
            } catch (error) {
                this._setButtonsEnabled(true);
            }
        },
    };

    const FormEventBusHandler = {
        _buttonHandler: null,

        _handleMainWindowButton(buttonId) {
            if (buttonId === 'applyBtn')
                return FormOperationsController.handleApplyRequest();
            if (buttonId === 'restartBtn')
                return FormInitializer._handleRestart();
            if (buttonId === 'closeBtn' || buttonId === 0 || buttonId === -1)
                return window.Autofiller.EventBus.closePlugin();
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

        _getButtonSource(windowId) {
            if (FormStateManager.confirmModal?.isShowing())
                return 'confirm';

            const plugin = window.Asc.plugin;
            if (!windowId || windowId === plugin.windowID || (!!plugin.guid && windowId === 'iframe_' + plugin.guid))
                return 'main';

            return 'unknown';
        },

        initialize() {
            if (!window.Autofiller?.Utils?.isPluginAvailable())
                return;

            this._buttonHandler = ({ id, windowId }) => {
                try {
                    switch (this._getButtonSource(windowId)) {
                        case 'confirm': this._handleConfirmModal(id); break;
                        case 'main': this._handleMainWindowButton(id); break;
                        default: this._closeUnknownWindow(windowId);
                    }
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
        _stopFormWatch: null,

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
                    FormStateManager.formUI = null;
                    FormStateManager.confirmModal = null;
                    this._initializeFormUI();
                    FormStateManager.confirmModal = new window.Autofiller.ConfirmModal({
                        translate: FormService.translate
                    });
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

                if (error?.code === AIService.UNAVAILABLE) {
                    this._showView('errorUnavailable');
                    this._waitForForm();
                } else {
                    FormOperationsController._setButtonsEnabled(true);
                    FormOperationsController._setCheckboxesEnabled(true);
                }
            }
        },

        _waitForForm() {
            if (this._stopFormWatch)
                return;

            this._stopFormWatch = AIService.watch((available) => {
                if (!available)
                    return;

                this._stopFormWatch();
                this._stopFormWatch = null;

                const hasData = FormStateManager.formFieldsData && FormStateManager.formFieldsData.length > 0;
                this._toggleView(hasData);
                FormOperationsController._setButtonsEnabled(true);
                if (hasData)
                    FormOperationsController._setCheckboxesEnabled(true);
            });
        },

        _showView(view) {
            const views = {
                form: document.getElementById('formContent'),
                empty: document.getElementById('emptyState'),
                errorUnavailable: document.getElementById('errorUnavailable')
            };

            Object.entries(views).forEach(([key, el]) => {
                if (!el) return;
                if (key === 'form') el.style.display = view === 'form' ? 'flex' : 'none';
                else el.classList.toggle('error--visible', view === key);
            });
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

            const formFields = await window.Autofiller.Utils.withTimeout(
                FormDetectionService.detectAllForms(),
                10000,
                'Form detection'
            );

            if (!formFields?.length) {
                window.location.href = 'index.html' + (window.Autofiller.getThemeURLParams ? window.Autofiller.getThemeURLParams() : '');
                return [];
            }

            updateMsg('Fetching data...');
            let realData;
            try {
                realData = await window.Autofiller.Utils.withTimeout(
                    window.Autofiller.DataExtractor.fetch(),
                    5000,
                    'Data Fetching'
                );
            } catch (fetchError) {
                return this._saveAndReturnEmpty(storage);
            }

            if (!realData || (typeof realData === 'object' && Object.keys(realData).length === 0))
                return this._saveAndReturnEmpty(storage);

            updateMsg('Checking AI availability...');

            await AIService.ensureAvailable(10000);

            updateMsg('Mapping fields with AI...');
            const dataKeys = window.Autofiller.DataMappingService.extractAllKeys(realData);
            const prompt = window.Autofiller.Prompts.getFieldMappingPrompt(dataKeys, formFields);
            const aiResult = await AIService.chat(prompt);
            const aiResponse = window.Autofiller.DataMappingService.parseAIResponse(aiResult.text);
            const fieldsWithOptions = FormDetectionService.enrichFieldsWithOptions(formFields, aiResponse.mapping, realData);

            if (!fieldsWithOptions || fieldsWithOptions.length === 0)
                return this._saveAndReturnEmpty(storage);

            storage.set('form_fields', fieldsWithOptions);
            return fieldsWithOptions;
        },

        _saveAndReturnEmpty(storage) {
            storage.set('form_fields', []);
            return [];
        },

        _toggleView(showForm) {
            this._showView(showForm ? 'form' : 'empty');
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
            }

            this._attachEventListeners();

            const restartBtnEmpty = document.getElementById('restartBtnEmpty');
            if (restartBtnEmpty) {
                restartBtnEmpty.addEventListener('click', () => this._handleRestart());
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
    window.Autofiller.AIService = AIService;
    window.Autofiller.FormService = FormService;
    window.Autofiller.FormDetectionService = FormDetectionService;

    if (window.Autofiller?.Utils?.isPluginAvailable()) {
        window.Asc.plugin.onThemeChanged = function (theme) {
            window.Asc.plugin.onThemeChangedBase(theme);
            if (typeof updateBodyThemeClasses === 'function') {
                updateBodyThemeClasses(theme.type, theme.name);
            }
            if (typeof updateThemeVariables === 'function') {
                updateThemeVariables(theme);
            }
        };

        window.Asc.plugin.init = function () {
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
