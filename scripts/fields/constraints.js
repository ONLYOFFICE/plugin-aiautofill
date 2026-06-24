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
(function(window, undefined) {
    const ConstraintsValidator = {
        toRegExp(mask) {
            let pattern = '^';
            for (let i = 0; i < mask.length; i++) {
                const char = mask[i];
                if (char === '9') pattern += '\\d';
                else if (char === 'a') pattern += '[A-Za-z]';
                else if (char === '*') pattern += '.';
                else pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            return new RegExp(pattern + '$');
        },

        toListItem(value, listValues) {
            const target = String(value).trim().toLowerCase();
            for (let i = 0; i < listValues.length; i++) {
                if (String(listValues[i]).trim().toLowerCase() === target)
                    return String(listValues[i]);
            }

            return null;
        },

        resolveValueForField(rawValue, field) {
            if (rawValue === null || rawValue === undefined)
                return null;

            let string = String(rawValue);
            const constraints = field.constraints || {};
            if (Array.isArray(constraints.listValues) && constraints.listValues.length > 0 && constraints.isEditable !== true)
                return this.toListItem(string, constraints.listValues);

            const format = constraints.format || {};
            if (format.type === 'mask' && format.value) {
                try { if (!this.toRegExp(format.value).test(string)) return null; } catch (e) {}
                return string;
            }

            if (format.type === 'regExp' && format.value) {
                try { if (!new RegExp('^(?:' + format.value + ')$').test(string)) return null; } catch (e) {}
                return string;
            }

            if (format.type === 'digit') 
                string = string.replace(/\D+/g, '');
            else if (format.type === 'letter')
                string = string.replace(/[^A-Za-z]+/g, '');

            if (constraints.allowedSymbols && typeof constraints.allowedSymbols === 'string' && constraints.allowedSymbols.length) {
                let filtered = '';
                for (let i = 0; i < string.length; i++)
                    if (constraints.allowedSymbols.indexOf(string[i]) !== -1)
                        filtered += string[i];

                string = filtered;
            }

            if (typeof constraints.charactersLimit === 'number' && constraints.charactersLimit > 0)
                string = string.slice(0, constraints.charactersLimit);

            if (field.type === 'dateForm' && string.trim() && isNaN(Date.parse(string)))
                return null;

            return string.length ? string : null;
        },

        splitValueAcrossBoxes(value, limits) {
            const digits = String(value == null ? '' : value).replace(/\D+/g, '');
            const result = new Array(limits.length).fill('');
            let idx = digits.length;
            for (let i = limits.length - 1; i >= 0; i--) {
                const limit = limits[i] > 0 ? limits[i] : idx;
                const start = Math.max(0, idx - limit);
                result[i] = digits.slice(start, idx);
                idx = start;
            }

            return result;
        },

        applyFieldConstraints(options, field) {
            const seen = new Set();
            const result = [];

            (options || []).forEach(option => {
                if (!option || option.source === 'no-mapping')
                    return;

                const raw = option.value;
                const resolved = this.resolveValueForField(raw, field);

                if (resolved === null || resolved === '')
                    return;

                if (!seen.has(resolved)) {
                    seen.add(resolved);
                    result.push({ label: resolved, value: resolved, source: 'validated' });
                }
            });

            return result;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.ConstraintsValidator = ConstraintsValidator;
})(window, undefined);
