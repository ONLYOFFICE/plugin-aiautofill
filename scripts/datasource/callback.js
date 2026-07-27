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
    let _nextCode = null;
    let _reachable = false;
    const REFRESH_CODE_KEY = 'refresh_code';
    const ORIGINAL_CODE_KEY = 'original_code';

    function getStorage() {
        return window.Autofiller.DataSourceContext.getStorage();
    }

    function loadNextCode() {
        if (_nextCode)
            return _nextCode;

        const storage = getStorage();
        const optionsCode = window.Asc?.plugin?.info?.options?.code;

        if (!storage) {
            if (optionsCode)
                _nextCode = optionsCode;
            return _nextCode;
        }

        const storedOriginalCode = storage.get(ORIGINAL_CODE_KEY);
        const storedRefreshCode = storage.get(REFRESH_CODE_KEY);

        if (optionsCode && storedOriginalCode && optionsCode !== storedOriginalCode) {
            storage.remove(REFRESH_CODE_KEY);
            storage.remove(ORIGINAL_CODE_KEY);
            storage.set(ORIGINAL_CODE_KEY, optionsCode);
            _nextCode = optionsCode;
            return _nextCode;
        }

        if (storedRefreshCode) {
            _nextCode = storedRefreshCode;
            storage.remove(REFRESH_CODE_KEY);
            return _nextCode;
        }

        if (optionsCode) {
            _nextCode = optionsCode;
            storage.set(ORIGINAL_CODE_KEY, optionsCode);
            return _nextCode;
        }

        return _nextCode;
    }

    function saveNextCode(code) {
        _nextCode = code;
        const storage = getStorage();
        if (storage && code)
            storage.set(REFRESH_CODE_KEY, code);
    }

    function validateResponse(result) {
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid API response: expected object with data and code');
        }

        if (!result.hasOwnProperty('data')) {
            throw new Error('Invalid API response: missing "data" property');
        }

        if (!result.hasOwnProperty('code') || typeof result.code !== 'string') {
            throw new Error('Invalid API response: missing or invalid "code" property');
        }
    }

    function getCallbackUrl() {
        const ctx = window.Autofiller.DataSourceContext;
        return ctx.getOptions().callback;
    }

    function prettyHost(url) {
        try {
            return new URL(url).host;
        } catch (e) {
            return url;
        }
    }

    const CallbackDataSource = {
        id: 'callback',
        label: 'From server',
        kind: 'remote',
        priority: 2,

        isConfigured() {
            const ctx = window.Autofiller.DataSourceContext;
            return ctx.isValidString(getCallbackUrl());
        },

        hasData() {
            return this.isConfigured();
        },

        status() {
            if (!this.isConfigured())
                return { state: 'empty' };
            return { state: 'ready', title: prettyHost(getCallbackUrl()) };
        },

        isReady() {
            return _reachable;
        },

        async test() {
            const ctx = window.Autofiller.DataSourceContext;
            const url = getCallbackUrl();
            if (!ctx.isValidString(url))
                return { ok: false, detail: 'No endpoint configured' };

            loadNextCode();
            const code = _nextCode;
            const address = code ? `${url}?code=${encodeURIComponent(code)}` : url;

            try {
                const result = await ctx.fetchJson(address);
                validateResponse(result);
                return { ok: true, detail: 'Connection successful' };
            } catch (error) {
                const suffix = error.status ? ` (${error.status})` : '';
                return { ok: false, detail: `Connection failed${suffix}` };
            }
        },

        async fetch() {
            const ctx = window.Autofiller.DataSourceContext;
            const url = getCallbackUrl();

            loadNextCode();
            const code = _nextCode;
            _nextCode = null;

            const address = code ? `${url}?code=${encodeURIComponent(code)}` : url;
            const result = await ctx.fetchJson(address);

            validateResponse(result);
            saveNextCode(result.code);

            return result.data;
        },

        panel: {
            _hostEl: null,
            _statusEl: null,

            _tr: (text) => text,
            _onChange: null,

            _renderHost() {
                const info = window.Autofiller.DataSources.status('callback');
                if (this._hostEl)
                    this._hostEl.textContent = info.title ? info.title + (info.detail ? ' · ' + this._tr(info.detail) : '') : '';
            },

            _setStatus(message) {
                if (!this._statusEl) return;
                this._statusEl.className = 'datasource-status' + (message ? ' datasource-status--error' : '');
                this._statusEl.textContent = message;
                this._statusEl.style.display = message ? 'block' : 'none';
            },

            mount(container, { tr, onChange }) {
                this._tr = tr;
                this._onChange = onChange;

                container.innerHTML = `
                    <div class="datasource-card">
                        <div class="datasource-card__row">
                            <div class="datasource-card__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>
                                </svg>
                            </div>
                            <span class="datasource-card__title i18n">Connected to your data service</span>
                        </div>
                        <div class="datasource-card__host"></div>
                        <p class="datasource-status" style="display: none;"></p>
                    </div>
                `;

                this._hostEl = container.querySelector('.datasource-card__host');
                this._statusEl = container.querySelector('.datasource-status');

                this._renderHost();
            },

            activate() {
                this._renderHost();

                _reachable = false;

                this._setStatus('');
                this._onChange?.();

                window.Autofiller.Utils.withTimeout(CallbackDataSource.test(), 5000, 'Endpoint test')
                    .then(result => {
                        _reachable = !!result?.ok;
                        this._onChange?.();
                    }).catch(() => {
                        _reachable = false;
                        this._onChange?.();
                    }).finally(() => {
                        if (!_reachable)
                            this._setStatus(this._tr("Couldn't reach your data service."));
                        this._onChange?.();
                    });
            },

            translate() {
                this._renderHost();
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.DataSources)
        window.Autofiller.DataSources.register(CallbackDataSource);
})(window, undefined);
