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

    const InlineDataSource = {
        id: 'inline',
        label: 'Paste JSON',
        kind: 'inline',
        priority: 0,
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
            return { state: 'ready', title: 'Pasted JSON', detail: 'Valid JSON' };
        },

        async test() {
            if (!this.hasData())
                return { ok: false, detail: 'No JSON pasted' };

            window.Autofiller.DataSourceContext.validateData(_data);
            return { ok: true, detail: 'Valid JSON' };
        },

        async fetch() {
            return window.Autofiller.DataSourceContext.validateData(_data);
        },

        load(text) {
            const ctx = window.Autofiller.DataSourceContext;
            const parsed = ctx.parseJson(text, 'pasted JSON');
            const data = ctx.validateData(ctx.unwrapData(parsed));

            _data = data;
            return data;
        },

        clear() {
            _data = null;
        },

        panel: {
            _textarea: null,
            _debounce: null,

            _tr: (text) => text,
            _onChange: null,

            mount(container, { tr, onChange }) {
                this._tr = tr;
                this._onChange = onChange;

                container.innerHTML = `
                    <textarea class="datasource__textarea" autocomplete="off" spellcheck="false"></textarea>
                `;

                this._textarea = container.querySelector('textarea');
                this._textarea.placeholder = tr('Paste your JSON here');
                this._textarea.addEventListener('input', () => this._handleInput());
            },

            translate() {
                if (this._textarea)
                    this._textarea.placeholder = this._tr('Paste your JSON here');
            },

            setProcessing(processing) {
                if (this._textarea) this._textarea.disabled = processing;
            },

            _handleInput() {
                clearTimeout(this._debounce);
                this._debounce = setTimeout(() => {
                    const text = (this._textarea?.value || '').trim();
                    if (!text) {
                        InlineDataSource.clear();
                    } else {
                        try {
                            InlineDataSource.load(this._textarea.value);
                        } catch (error) {
                            InlineDataSource.clear();
                        }
                    }
                    this._onChange?.();
                }, 250);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.InlineDataSource = InlineDataSource;
    if (window.Autofiller.DataSources)
        window.Autofiller.DataSources.register(InlineDataSource);
})(window, undefined);
