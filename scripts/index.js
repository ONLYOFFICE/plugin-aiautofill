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
    const tr = (text) => (window.Asc?.plugin?.tr ? window.Asc.plugin.tr(text) : text);

    const SourceWidget = {
        _onSelect: null,
        _onChange: null,
        _pasteDebounce: null,
        _remoteReady: false,
        _dragDepth: 0,

        _panelActivators: {
            json: () => SourceWidget._refreshFilePanel(),
            callback: () => SourceWidget._refreshRemotePanel()
        },

        _panelTranslators: {
            callback: () => SourceWidget._renderRemoteHost()
        },

        init({ onSelect, onChange }) {
            this._onSelect = onSelect;
            this._onChange = onChange;

            const datasources = window.Autofiller.DataSources;

            datasources.select('');
            window.Autofiller.JsonDataSource?.clear();
            window.Autofiller.InlineDataSource?.clear();

            const paste = document.getElementById('pasteInput');
            if (paste) paste.value = '';

            let selected = datasources.autoSelect();
            if (!selected) {
                const first = window.Autofiller.DataSources.listOrdered()[0];
                selected = first ? datasources.select(first.id) : '';
            }

            this.translate();
            this._activate(selected || '');
            this._bindEvents();
        },

        isReady() {
            const datasources = window.Autofiller.DataSources;
            const source = datasources.get(datasources.getSelectedId());
            if (!source?.hasData?.())
                return false;

            return source.kind === 'remote' ? this._remoteReady : true;
        },

        setProcessing(processing) {
            ['removeFileBtn', 'pasteInput', 'dataFileInput'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.disabled = processing;
            });

            document.querySelectorAll('.datasource__tab').forEach(tab => { tab.disabled = processing; });
            document.getElementById('dropzone')?.classList.toggle('dropzone--disabled', processing);
        },

        translate() {
            const paste = document.getElementById('pasteInput');
            if (paste)
                paste.placeholder = tr(paste.getAttribute('data-i18n-placeholder') || paste.placeholder);

            this._renderTabs();
            this._panelTranslators[window.Autofiller.DataSources.getSelectedId()]?.();
        },

        _renderTabs() {
            const tabs = document.getElementById('sourceTabs');
            if (!tabs) return;

            const items = window.Autofiller.DataSources.listOrdered();
            const selectedId = window.Autofiller.DataSources.getSelectedId();

            tabs.innerHTML = '';
            if (items.length <= 1) {
                tabs.style.display = 'none';
                return;
            }

            tabs.style.display = 'flex';
            items.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'datasource__tab' + (item.id === selectedId ? ' datasource__tab--active' : '');
                button.textContent = tr(item.label);
                button.setAttribute('role', 'tab');
                button.dataset.sourceId = item.id;
                button.addEventListener('click', () => this._activate(item.id));
                tabs.appendChild(button);
            });
        },

        _activate(id) {
            window.Autofiller.DataSources.select(id);
            this._onSelect?.();

            document.querySelectorAll('.datasource__tab').forEach(tab => {
                tab.classList.toggle('datasource__tab--active', tab.dataset.sourceId === id);
            });

            document.querySelectorAll('.datasource__panel').forEach(panel => {
                panel.style.display = panel.dataset.panel === id ? 'flex' : 'none';
            });

            this._panelActivators[id]?.();

            this._onChange?.();
        },

        _refreshFilePanel() {
            const source = window.Autofiller.JsonDataSource;
            const chip = document.getElementById('fileChip');
            const dropzone = document.getElementById('dropzone');
            const hasData = !!source?.hasData?.();

            document.getElementById('fileChipTitle').textContent = hasData ? (source.fileName || 'data.json') : '';

            if (chip)
                chip.style.display = hasData ? 'flex' : 'none';

            if (dropzone)
                dropzone.style.display = hasData ? 'none' : 'flex';
        },

        async _handleFile(file) {
            if (!file) return;
            try {
                const text = await file.text();
                window.Autofiller.JsonDataSource.load(text, file.name);
            } catch (error) {
                window.Autofiller.JsonDataSource.clear();
            } finally {
                this._refreshFilePanel();
                this._onChange?.();
            }
        },

        _handleRemoveFile() {
            window.Autofiller.JsonDataSource.clear();
            this._refreshFilePanel();
            this._onChange?.();
        },

        _handlePasteInput() {
            clearTimeout(this._pasteDebounce);
            this._pasteDebounce = setTimeout(() => {
                const input = document.getElementById('pasteInput');
                const text = (input?.value || '').trim();
                if (!text) {
                    window.Autofiller.InlineDataSource.clear();
                } else {
                    try {
                        window.Autofiller.InlineDataSource.load(input.value);
                    } catch (error) {
                        window.Autofiller.InlineDataSource.clear();
                    }
                }

                this._onChange?.();
            }, 250);
        },

        _setRemoteStatus(message) {
            const status = document.getElementById('remoteStatus');
            if (!status)
                return;

            status.className = 'datasource-status' + (message ? ' datasource-status--error' : '');
            status.textContent = message;
            status.style.display = message ? 'block' : 'none';
        },

        _renderRemoteHost() {
            const info = window.Autofiller.DataSources.status('callback');
            const host = document.getElementById('remoteHost');
            if (host)
                host.textContent = info.title ? info.title + (info.detail ? ' · ' + tr(info.detail) : '') : '';
        },

        _refreshRemotePanel() {
            this._renderRemoteHost();

            this._remoteReady = false;
            this._setRemoteStatus('');
            this._onChange?.();

            const datasources = window.Autofiller.DataSources;
            window.Autofiller.Utils.withTimeout(datasources.test('callback'), 5000, 'Endpoint test')
                .then(result => { this._remoteReady = !!result?.ok; })
                .catch(() => { this._remoteReady = false; })
                .finally(() => {
                    if (!this._remoteReady)
                        this._setRemoteStatus(tr("Couldn't reach your data service."));
                    this._onChange?.();
                });
        },

        _bindEvents() {
            const dropzone = document.getElementById('dropzone');
            const fileInput = document.getElementById('dataFileInput');

            dropzone?.addEventListener('click', () => fileInput?.click());
            dropzone?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
            });

            ['dragenter', 'dragover', 'drop'].forEach(type => {
                window.addEventListener(type, (e) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                });
            });

            dropzone?.addEventListener('dragenter', (e) => {
                e.preventDefault();
                this._dragDepth++;
                dropzone.classList.add('dropzone--dragover');
            });

            dropzone?.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dropzone--dragover');
            });

            dropzone?.addEventListener('dragleave', () => {
                this._dragDepth = Math.max(0, this._dragDepth - 1);
                if (this._dragDepth === 0)
                    dropzone.classList.remove('dropzone--dragover');
            });

            dropzone?.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._dragDepth = 0;
                dropzone.classList.remove('dropzone--dragover');
                const file = e.dataTransfer?.files?.[0];
                if (file) this._handleFile(file);
            });

            fileInput?.addEventListener('change', (e) => {
                this._handleFile(e.target.files && e.target.files[0]);
                e.target.value = '';
            });
            
            document.getElementById('removeFileBtn')?.addEventListener('click', () => this._handleRemoveFile());
            document.getElementById('pasteInput')?.addEventListener('input', () => this._handlePasteInput());
        }
    };

    const App = {
        loader: null,
        hostPluginReady: false,

        init() {
            if (window.Asc.plugin.info.theme)
                this.onThemeChanged(window.Asc.plugin.info.theme);

            if (typeof window.Autofiller.Loader !== 'undefined')
                this.loader = new window.Autofiller.Loader('#loaderContainer', '#mainWindow', {
                    translate: tr,
                    defaultMessage: 'Loading...'
                });

            this._setButtonsEnabled(false);

            document.getElementById('autofillBtn')?.addEventListener('click', () => this._handleDetection());
            document.getElementById('cancelBtn')?.addEventListener('click', () => this._close());
            document.getElementById('retryBtnFields')?.addEventListener('click', () => this._handleRestart());
            document.getElementById('retryBtnEmpty')?.addEventListener('click', () => this._handleRestart());

            SourceWidget.init({
                onSelect: () => this._showAutofillError(''),
                onChange: () => this._applyButtonState()
            });

            window.Asc.plugin.attachEvent('onThemeChanged', (theme) => this.onThemeChanged(theme));

            this._initializePlugin();
        },

        onThemeChanged(theme) {
            window.Asc.plugin.onThemeChangedBase(theme);
            updateBodyThemeClasses(theme.type, theme.name);
            updateThemeVariables(theme);
        },

        onTranslate() {
            document.querySelectorAll('.i18n').forEach(element => {
                if (element.innerText)
                    element.innerText = tr(element.innerText.trim());
            });
            SourceWidget.translate();
        },

        _applyButtonState() {
            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) cancelBtn.disabled = !this.hostPluginReady;

            const autofillBtn = document.getElementById('autofillBtn');
            if (autofillBtn) autofillBtn.disabled = !this.hostPluginReady || !SourceWidget.isReady();
        },

        _setButtonsEnabled(enabled) {
            this.hostPluginReady = enabled;
            this._applyButtonState();
        },

        _setProcessing(processing) {
            SourceWidget.setProcessing(processing);

            if (processing) {
                ['autofillBtn', 'cancelBtn'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.disabled = true;
                });
            } else {
                this._applyButtonState();
            }
        },

        _showAutofillError(message) {
            const el = document.getElementById('autofillError');
            if (!el) return;
            el.textContent = message || '';
            el.style.display = message ? 'block' : 'none';
        },

        _showView(view) {
            const views = {
                welcome: document.getElementById('welcomeContent'),
                empty: document.getElementById('emptyState'),
                errorModel: document.getElementById('errorModel'),
                errorFields: document.getElementById('errorFields'),
                errorSigned: document.getElementById('errorSigned')
            };

            Object.entries(views).forEach(([key, el]) => {
                if (!el) return;
                if (key === 'welcome') el.style.display = view === 'welcome' ? 'block' : 'none';
                else el.classList.toggle('error--visible', view === key);
            });
        },

        _handleRestart() {
            window.Autofiller.FormDetectionService.detectAllForms().then(formFields => {
                if (!formFields || formFields.length === 0)
                    this._showView('errorFields');
                else
                    window.location.reload();
            }).catch(error => {
                console.error('Error checking form fields:', error);
                this._showView('errorFields');
            });
        },

        _failToWelcome(message) {
            if (this.loader) this.loader.hide();
            this._setButtonsEnabled(true);
            this._showView('welcome');
            this._showAutofillError(message);
        },

        async _handleDetection() {
            let navigating = false;
            try {
                this._showAutofillError('');
                this._setButtonsEnabled(false);
                this._setProcessing(true);
                if (this.loader)
                    this.loader.show(tr('Analyzing form fields with AI'));

                const allFormFields = await window.Autofiller.FormDetectionService.detectAllForms();
                const formFields = window.Autofiller.Prompts.filterMeaningfulFields(allFormFields || []);
                if (!formFields.length) {
                    if (this.loader) this.loader.hide();
                    this._showView('errorFields');
                    return;
                }

                if (this.loader) this.loader.updateMessage(tr('Fetching data'));

                let realData;
                try {
                    realData = await window.Autofiller.Utils.withTimeout(
                        window.Autofiller.DataSources.fetch(),
                        5000,
                        'Data Fetching'
                    );
                } catch (fetchError) {
                    this._failToWelcome(tr("Couldn't get data from this source. Try another source."));
                    return;
                }

                if (!realData || (typeof realData === 'object' && Object.keys(realData).length === 0)) {
                    this._failToWelcome(tr('This source returned no data. Try another source.'));
                    return;
                }

                if (this.loader)
                    this.loader.updateMessage(tr('Checking AI availability'));

                const aiCheckResult = await this._checkAI(5000);
                if (!aiCheckResult.available) {
                    if (this.loader) this.loader.hide();
                    this._showView(this._getErrorView(aiCheckResult.error));
                    return;
                }

                if (this.loader)
                    this.loader.updateMessage(tr('Mapping fields with AI'));

                let aiResult;
                try {
                    const dataKeys = window.Autofiller.DataMappingService.extractAllKeys(realData);
                    const prompt = window.Autofiller.Prompts.getFieldMappingPrompt(dataKeys, formFields);
                    aiResult = await window.Autofiller.FormService.executeAI(prompt);
                } catch (aiError) {
                    if (this.loader) this.loader.hide();
                    this._showView(this._getErrorView(aiError));
                    return;
                }

                const aiResponse = window.Autofiller.DataMappingService.parseAIResponse(aiResult.text);
                const fieldsWithOptions = window.Autofiller.FormDetectionService.enrichFieldsWithOptions(formFields, aiResponse.mapping, realData);

                if (!fieldsWithOptions || fieldsWithOptions.length === 0) {
                    if (this.loader) this.loader.hide();
                    this._showView('empty');
                    return;
                }

                const storage = window.Autofiller.StorageManager('autofiller');
                storage.set('form_fields', fieldsWithOptions);
                window.Autofiller.DataSources.clearSession();

                if (this.loader) this.loader.updateMessage(tr('Loading form'));

                navigating = true;
                window.location.href = 'form.html' + (window.Autofiller.getThemeURLParams ? window.Autofiller.getThemeURLParams() : '');
            } catch (error) {
                console.error('Error detecting form fields', error);
                if (this.loader)
                    this.loader.hide();

                this._showView(this._getErrorView(error));
            } finally {
                if (!navigating)
                    this._setProcessing(false);
            }
        },

        _getErrorView(error) {
            const s = (error?.message || error?.error || String(error || '')).toLowerCase();
            if (error?.status || /http|fetch|network|404|500/.test(s))
                return 'empty';

            return 'errorModel';
        },

        _close() {
            window.Asc.plugin.executeCommand('close', '');
        },

        _checkAI(timeout = 5000) {
            return new Promise((resolve) => {
                const timer = setTimeout(() => resolve({ available: false, error: 'AI check timed out' }), timeout);

                if (!window.Asc?.plugin?.executeMethod) {
                    clearTimeout(timer);
                    return resolve({ available: false, error: 'Plugin API not available' });
                }

                try {
                    window.Asc.plugin.executeMethod('AI', [{ type: 'Actions' }], (data) => {
                        clearTimeout(timer);
                        const hasChat = data?.Actions?.some(a => a?.Chat);
                        resolve(hasChat ? { available: true, data } : { available: false, error: 'No AI model configured' });
                    });
                } catch (e) {
                    clearTimeout(timer);
                    resolve({ available: false, error: e.message });
                }
            });
        },

        async _startAICheck() {
            const initialCheck = await this._checkAI(5000);
            this._setButtonsEnabled(initialCheck.available);
            this._showView(initialCheck.available ? 'welcome' : 'errorModel');

            let lastState = initialCheck.available;
            setInterval(async () => {
                if (!window.Asc?.plugin?.executeMethod) return;
                try {
                    const result = await this._checkAI(1000);
                    if (result.available !== lastState) {
                        lastState = result.available;
                        this._setButtonsEnabled(lastState);
                        this._showView(lastState ? 'welcome' : 'errorModel');
                    }
                } catch (e) { console.error('AI check error:', e); }
            }, 1000);
        },

        async _initializePlugin() {
            try {
                const signedPromise = new Promise((resolve) => {
                    window.Asc.plugin.executeMethod('IsFormSigned', [], (result) => resolve(result));
                });
                const formFieldsPromise = window.Autofiller.FormDetectionService.detectAllForms();
                const [signed, formFields] = await Promise.all([signedPromise, formFieldsPromise]);

                document.documentElement.classList.add('theme-ready');

                if (signed) {
                    if (this.loader) this.loader.hide();
                    this._showView('errorSigned');
                    return;
                }

                if (!formFields || formFields.length === 0) {
                    if (this.loader) this.loader.hide();
                    this._showView('errorFields');
                    return;
                }

                await this._startAICheck();
            } catch (error) {
                console.error('Error checking form fields on init:', error);
                document.documentElement.classList.add('theme-ready');
                await this._startAICheck();
            }
        }
    };

    window.Asc.plugin.onThemeChanged = (theme) => App.onThemeChanged(theme);
    window.Asc.plugin.init = () => App.init();
    window.Asc.plugin.onTranslate = () => App.onTranslate();
})(window, undefined);
