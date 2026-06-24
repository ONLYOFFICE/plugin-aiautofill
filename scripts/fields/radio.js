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
    const RadioHandler = {
        id: 'radio',

        match(field) {
            return !!field.isRadioGroup;
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
        },

        getTargets(field) {
            return (field.choices || [])
                .filter(choice => choice && choice.internalId)
                .map(choice => ({ internalId: choice.internalId, type: 'checkBoxForm' }));
        },

        async apply(field) {
            const wanted = String(field.value || '').trim().toLowerCase();
            const target = (field.choices || []).find(
                choice => String(choice.choice || '').trim().toLowerCase() === wanted
            );

            if (target)
                await window.Autofiller.FieldTypeContext.setValue(target.internalId, true);
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.FieldTypes)
        window.Autofiller.FieldTypes.register(RadioHandler);
})(window, undefined);
