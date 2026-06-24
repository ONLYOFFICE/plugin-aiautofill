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
    const TextHandler = {
        id: 'text',
        isDefault: true,

        enrich(field, dataKeys, sourceData) {
            const ctx = window.Autofiller.FieldTypeContext;
            let options = [];
            if (dataKeys)
                options = ctx.generateOptions(dataKeys, sourceData, field.type);

            options = ctx.applyConstraints(options, field);

            if (options.length === 0)
                options = [{ label: '', value: '', source: 'no-mapping' }];

            return options;
        },

        async apply(field) {
            await window.Autofiller.FieldTypeContext.setValue(field.fieldId, field.value);
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.FieldTypes)
        window.Autofiller.FieldTypes.register(TextHandler);
})(window, undefined);
