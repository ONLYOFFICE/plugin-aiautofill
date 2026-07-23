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
    const ChoiceHandler = {
        id: 'choice',

        match(field) {
            if (field.isRadioGroup)
                return false;
            if (field.type === 'dropDownForm')
                return true;
            return field.type === 'comboBoxForm' && !(field.constraints && field.constraints.isEditable);
        },

        isSelfSufficient(field) {
            const listValues = field.constraints && field.constraints.listValues;
            return Array.isArray(listValues) && listValues.length > 0;
        },

        enrich(field, dataKeys, sourceData) {
            const ctx = window.Autofiller.FieldTypeContext;
            let options = [];
            if (dataKeys)
                options = ctx.generateOptions(dataKeys, sourceData, field.type);

            options = ctx.applyConstraints(options, field);

            const resolved = options.filter(option => option.source !== 'no-mapping');
            const seen = new Set(resolved.map(option => option.value));
            const merged = resolved.slice();

            const listValues = (field.constraints && field.constraints.listValues) || [];
            listValues.forEach(value => {
                if (!seen.has(value)) {
                    seen.add(value);
                    merged.push({ label: value, value: value, source: 'list' });
                }
            });

            return merged.length ? merged : [{ label: '', value: '', source: 'no-mapping' }];
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.FieldTypes)
        window.Autofiller.FieldTypes.register(ChoiceHandler);
})(window, undefined);
