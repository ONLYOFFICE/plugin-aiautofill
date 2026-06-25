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

    const CallbackDataSource = {
        id: 'callback',
        label: 'Endpoint',

        isAvailable() {
            const ctx = window.Autofiller.DataSourceContext;
            return ctx.isValidString(ctx.getOptions().callback);
        },

        async fetch() {
            const ctx = window.Autofiller.DataSourceContext;
            const url = ctx.getOptions().callback;

            loadNextCode();
            const code = _nextCode;
            _nextCode = null;

            const address = code ? `${url}?code=${encodeURIComponent(code)}` : url;
            const result = await ctx.fetchJson(address);

            validateResponse(result);
            saveNextCode(result.code);

            return result.data;
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.DataSources)
        window.Autofiller.DataSources.register(CallbackDataSource);
})(window, undefined);
