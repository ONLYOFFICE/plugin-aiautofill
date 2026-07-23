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

        _normalizeListText(value) {
            return String(value).toLowerCase().replace(/[\s\-_.,;:!?()[\]'"\/\\]+/g, ' ').trim();
        },

        toListItem(value, listValues) {
            const target = this._normalizeListText(value);
            if (!target)
                return null;

            for (let i = 0; i < listValues.length; i++) {
                if (this._normalizeListText(listValues[i]) === target)
                    return String(listValues[i]);
            }

            const candidates = [];
            for (let i = 0; i < listValues.length; i++) {
                const item = this._normalizeListText(listValues[i]);
                if (item && (target.indexOf(item) !== -1 || item.indexOf(target) !== -1))
                    candidates.push(listValues[i]);
            }

            return candidates.length === 1 ? String(candidates[0]) : null;
        },

        resolveValueForField(rawValue, field) {
            if (rawValue === null || rawValue === undefined)
                return null;

            let string = String(rawValue).trim();
            if (!string)
                return null;

            const constraints = field.constraints || {};
            if (Array.isArray(constraints.listValues) && constraints.listValues.length > 0 && constraints.isEditable !== true)
                return this.toListItem(string, constraints.listValues);

            const format = constraints.format || {};
            if (format.type === 'mask' && format.value) {
                try { if (!this.toRegExp(format.value).test(string)) return null; } catch (e) { return null; }
            } else if (format.type === 'regExp' && format.value) {
                try { if (!new RegExp('^(?:' + format.value + ')$').test(string)) return null; } catch (e) { return null; }
            } else if (format.type === 'digit') {
                if (!/^\d+$/.test(string))
                    return null;
            } else if (format.type === 'letter') {
                if (!/^[A-Za-z\s\-']+$/.test(string) || !/[A-Za-z]/.test(string))
                    return null;
            }

            if (constraints.allowedSymbols && typeof constraints.allowedSymbols === 'string' && constraints.allowedSymbols.length) {
                for (let i = 0; i < string.length; i++) {
                    const ch = string[i];
                    if (constraints.allowedSymbols.indexOf(ch) === -1 && !/[\s\-']/.test(ch))
                        return null;
                }
            }

            if (typeof constraints.charactersLimit === 'number' && constraints.charactersLimit > 0
                && string.length > constraints.charactersLimit)
                return null;

            if (field.type === 'dateForm' && isNaN(Date.parse(string)))
                return null;

            return string;
        },

        splitValueAcrossBoxes(value, limits) {
            const digits = String(value == null ? '' : value).replace(/\D+/g, '');
            const capacity = limits.reduce((sum, limit) => sum + (limit > 0 ? limit : 0), 0);
            if (capacity > 0 && digits.length > capacity)
                return null;

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
