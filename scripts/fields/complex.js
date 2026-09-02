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
    const ComplexHandler = {
        id: 'complex',

        match(field) {
            return !!field.isComplex;
        },

        getTargets(field) {
            return (field.subFields || []).filter(subField => subField && subField.internalId);
        },

        async apply(field) {
            const ctx = window.Autofiller.FieldTypeContext;
            const targets = this.getTargets(field);
            if (!targets.length) {
                await ctx.setValue(field.fieldId, field.value);
                return;
            }

            const parts = ctx.splitValueAcrossBoxes(
                field.value,
                targets.map(subField => subField.charactersLimit)
            );

            for (let i = 0; i < targets.length; i++)
                await ctx.setValue(targets[i].internalId, parts[i] || '');
        }
    };

    window.Autofiller = window.Autofiller || {};
    if (window.Autofiller.FieldTypes)
        window.Autofiller.FieldTypes.register(ComplexHandler);
})(window, undefined);
