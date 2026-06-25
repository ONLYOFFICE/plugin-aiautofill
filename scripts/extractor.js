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

    const DataExtractor = {
        _isValidCallback() {
            return window.Asc?.plugin?.info?.options?.callback &&
                typeof window.Asc.plugin.info.options.callback === 'string';
        },

        _getStorage() {
            if (typeof window.Autofiller?.StorageManager === 'function')
                return window.Autofiller.StorageManager('autofiller');
            return null;
        },

        _loadNextCode() {
            if (_nextCode)
                return _nextCode;

            const storage = this._getStorage();
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
        },

        _saveNextCode(code) {
            _nextCode = code;
            const storage = this._getStorage();
            if (storage && code)
                storage.set(REFRESH_CODE_KEY, code);
        },

        _updateNextCode() {
            this._loadNextCode();
        },

        _validateResponse(result) {
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid API response: expected object with data and code');
            }

            if (!result.hasOwnProperty('data')) {
                throw new Error('Invalid API response: missing "data" property');
            }

            if (!result.hasOwnProperty('code') || typeof result.code !== 'string') {
                throw new Error('Invalid API response: missing or invalid "code" property');
            }
        },

        async fetch() {
            try {
                if (!this._isValidCallback()) {
                    throw new Error('Invalid or missing callback URL');
                }

                const url = window.Asc.plugin.info.options.callback;
                this._updateNextCode();

                const code = _nextCode;
                _nextCode = null;

                const address = code ? `${url}?code=${encodeURIComponent(code)}` : url;
                const response = await fetch(address, { credentials: 'omit' });

                if (!response.ok) {
                    const error = new Error(`HTTP error! status: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                const result = await response.json();
                this._validateResponse(result);
                this._saveNextCode(result.code);

                return result.data;
            } catch (error) {
                if (error.status)
                    throw error;
                throw new Error(`Failed to fetch data: ${error.message}`);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataExtractor = DataExtractor;
})(window, undefined);
