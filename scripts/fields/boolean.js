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
    const BooleanHandler = {
        id: 'boolean',

        _toBoolean(value) {
            if (typeof value === 'boolean')
                return value;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                if (normalized === 'true')
                    return true;
                if (normalized === 'false')
                    return false;
            }

            return null;
        },

        match(field) {
            return window.Autofiller.FieldTypeContext.isBooleanField(field.type);
        },

        isSelfSufficient() {
            return true;
        },

        enrich(field, dataKeys, sourceData) {
            const ctx = window.Autofiller.FieldTypeContext;
            const keys = dataKeys ? (Array.isArray(dataKeys) ? dataKeys : [dataKeys]) : [];
            for (const dataKey of keys) {
                const value = ctx.extractValue(sourceData, dataKey);
                const boolValue = ctx.resolveBooleanValue(value, field);
                if (boolValue !== null)
                    return [
                        ctx.createOption(boolValue),
                        ctx.createOption(boolValue === 'true' ? 'false' : 'true')
                    ];
            }

            // No resolvable with AI — fall back to manual true/false options.
            return [
                { label: 'false', value: 'false', source: 'list' },
                { label: 'true', value: 'true', source: 'list' }
            ];
        },

        normalizeStored(field) {
            field.generatedOptions = (field.generatedOptions || [])
                .filter(opt => /^(true|false)$/.test(String(opt.value || '').trim().toLowerCase()))
                .map(opt => {
                    const v = String(opt.value).trim().toLowerCase();
                    return { label: v, value: v, source: 'validated' };
                });

            return field.generatedOptions.length > 0;
        },

        async apply(field) {
            const boolValue = this._toBoolean(field.value);
            if (boolValue === null)
                return;

            await window.Autofiller.FieldTypeContext.setValue(field.fieldId, boolValue);
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.FieldTypes)
        window.Autofiller.FieldTypes.register(BooleanHandler);
})(window, undefined);
