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
    const MAX_RAW_BYTES = 5 * 1024 * 1024;

    const DataSourceContext = {
        MAX_RAW_BYTES,

        getOptions() {
            return window.Asc?.plugin?.info?.options || {};
        },

        isValidString(value) {
            return typeof value === 'string' && value.trim().length > 0;
        },

        getStorage() {
            if (typeof window.Autofiller?.StorageManager === 'function')
                return window.Autofiller.StorageManager('autofiller');
            return null;
        },

        isDataLarge(error) {
            return !!error?.tooLarge;
        },

        validateDataSize(text) {
            if (typeof text !== 'string')
                return;

            if (new TextEncoder().encode(text).length > MAX_RAW_BYTES) {
                const mb = Math.round(MAX_RAW_BYTES / (1024 * 1024));
                const error = new Error(`Data source exceeds the ${mb} MB size limit`);
                error.tooLarge = true;
                throw error;
            }
        },

        parseJson(raw, source) {
            if (typeof raw !== 'string')
                return raw;

            this.validateDataSize(raw);

            try {
                return JSON.parse(raw);
            } catch (error) {
                throw new Error(`Failed to parse JSON from ${source}: ${error.message}`);
            }
        },

        unwrapData(parsed) {
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                && Object.prototype.hasOwnProperty.call(parsed, 'data'))
                return parsed.data;
            return parsed;
        },

        validateData(data) {
            if (data === null || data === undefined)
                throw new Error('Data source is empty');
            if (typeof data !== 'object')
                throw new Error('Invalid data source: expected a JSON object or array');

            return data;
        },

        async fetchJson(url) {
            const response = await fetch(url, { credentials: 'omit' });

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                error.status = response.status;
                throw error;
            }

            const text = await response.text();
            this.validateDataSize(text);

            try {
                return JSON.parse(text);
            } catch (error) {
                throw new Error(`Failed to parse JSON response: ${error.message}`);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataSourceContext = DataSourceContext;
})(window, undefined);
