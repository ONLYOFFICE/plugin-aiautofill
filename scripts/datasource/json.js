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
    let _data = null;
    let _fileName = null;

    const JsonDataSource = {
        id: 'json',
        label: 'Upload file',
        kind: 'file',
        priority: 1,
        cacheable: true,

        isConfigured() {
            return true;
        },

        hasData() {
            return _data !== null && _data !== undefined;
        },

        status() {
            if (!this.hasData())
                return { state: 'empty' };
            return { state: 'ready', title: _fileName || 'data.json', detail: 'Valid JSON' };
        },

        async test() {
            if (!this.hasData())
                return { ok: false, detail: 'No file loaded' };

            window.Autofiller.DataSourceContext.validateData(_data);
            return { ok: true, detail: 'Valid JSON' };
        },

        async fetch() {
            return window.Autofiller.DataSourceContext.validateData(_data);
        },

        load(text, fileName) {
            const ctx = window.Autofiller.DataSourceContext;
            const parsed = ctx.parseJson(text, fileName || 'uploaded file');
            const data = ctx.validateData(ctx.unwrapData(parsed));

            _data = data;
            _fileName = fileName || null;

            JsonDataSource.panel._refresh();

            return data;
        },

        clear() {
            _data = null;
            _fileName = null;

            JsonDataSource.panel._refresh();
        },

        get fileName() {
            return _fileName;
        },

        panel: {
            _dropzone: null,

            _chip: null,
            _chipTitle: null,

            _removeBtn: null,
            _fileInput: null,

            _dragDepth: 0,

            _onChange: null,
            _onDataTooLarge: null,

            onDataTooLarge(error) {
                this._onDataTooLarge?.(error);
            },

            async _handleFile(file) {
                if (!file) return;

                const ctx = window.Autofiller.DataSourceContext;
                if (file.size > ctx.MAX_RAW_BYTES) {
                    const error = new Error('File exceeds the size limit');
                    error.tooLarge = true;
                    this.onDataTooLarge(error);
                    return;
                }

                try {
                    const text = await file.text();
                    JsonDataSource.load(text, file.name);
                } catch (error) {
                    if (ctx.isDataLarge(error)) {
                        this.onDataTooLarge(error);
                        return;
                    }

                    JsonDataSource.clear();
                } finally {
                    this._onChange?.();
                }
            },

            _bindEvents() {
                const dropzone = this._dropzone;

                dropzone?.addEventListener('click', () => this._fileInput?.click());
                dropzone?.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._fileInput?.click();
                    }
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

                    if (file)
                        this._handleFile(file);
                });

                this._fileInput?.addEventListener('change', (e) => {
                    this._handleFile(e.target.files && e.target.files[0]);
                    e.target.value = '';
                });

                this._removeBtn?.addEventListener('click', () => {
                    JsonDataSource.clear();
                    this._onChange?.();
                });
            },

            _refresh() {
                const hasData = JsonDataSource.hasData();
                if (this._chipTitle)
                    this._chipTitle.textContent = hasData ? (JsonDataSource.fileName || 'data.json') : '';
                if (this._chip)
                    this._chip.style.display = hasData ? 'flex' : 'none';
                if (this._dropzone)
                    this._dropzone.style.display = hasData ? 'none' : 'flex';
            },

            mount(container, { onChange, onDataTooLarge }) {
                this._onChange = onChange;
                this._onDataTooLarge = onDataTooLarge;

                container.innerHTML = `
                    <input type="file" accept=".json,application/json" autocomplete="off" hidden>
                    <div class="dropzone" tabindex="0" role="button" aria-label="Upload JSON file">
                        <div class="dropzone__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 16V4M12 4l-4 4M12 4l4 4"></path>
                                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
                            </svg>
                        </div>
                        <div class="dropzone__title i18n">Drag your JSON file here</div>
                        <div class="dropzone__hint i18n">or click to browse</div>
                    </div>
                    <div class="datasource-chip" style="display: none;">
                        <div class="datasource-chip__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <path d="M14 2v6h6"></path>
                            </svg>
                        </div>
                        <div class="datasource-chip__title"></div>
                        <button type="button" class="datasource-chip__remove" title="Remove" aria-label="Remove">&times;</button>
                    </div>
                `;

                this._dropzone = container.querySelector('.dropzone');

                this._chip = container.querySelector('.datasource-chip');
                this._chipTitle = container.querySelector('.datasource-chip__title');

                this._removeBtn = container.querySelector('.datasource-chip__remove');
                this._fileInput = container.querySelector('input[type="file"]');

                this._bindEvents();
                this._refresh();
            },

            activate() {
                this._refresh();
            },

            setProcessing(processing) {
                if (this._fileInput)
                    this._fileInput.disabled = processing;
                if (this._removeBtn)
                    this._removeBtn.disabled = processing;

                this._dropzone?.classList.toggle('dropzone--disabled', processing);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.JsonDataSource = JsonDataSource;
    if (window.Autofiller.DataSources)
        window.Autofiller.DataSources.register(JsonDataSource);
})(window, undefined);
