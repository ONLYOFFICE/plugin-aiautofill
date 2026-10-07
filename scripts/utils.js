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
(function (window) {
    const Utils = {
        /**
         * @template T
         * @param {() => T} fn
         * @param {string} errorMsg
         * @returns {T | null}
         */
        safeExecute(fn, errorMsg) {
            try {
                return fn();
            } catch (e) {
                console.error(errorMsg, e);
                return null;
            }
        },

        isPluginAvailable() {
            return window.Asc?.plugin;
        },

        /** @param {string} param */
        getDecodedURLParam(param) {
            const params = new URLSearchParams(window.location.search);
            const value = params.get(param);
            return value ? decodeURIComponent(value) : null;
        },

        /**
         * @template T
         * @param {Promise<T>} promise
         * @param {number} timeoutMs
         * @param {string} [operationName]
         * @returns {Promise<T>}
         */
        withTimeout(promise, timeoutMs, operationName = 'Operation') {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
        },
    };

    window.Autofiller = window.Autofiller || /** @type {AutofillerNamespace} */ ({});
    window.Autofiller.Utils = Utils;
})(window);
