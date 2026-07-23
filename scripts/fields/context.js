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
    const FieldTypeContext = {
        extractValue(data, key) {
            return window.Autofiller.FormDetectionService._extractValueFromData(data, key);
        },

        generateOptions(dataKeys, sourceData, fieldType) {
            const service = window.Autofiller.FormDetectionService;
            return Array.isArray(dataKeys)
                ? service._generateOptionsFromMultipleKeys(dataKeys, sourceData, fieldType)
                : service._generateOptionsFromSingleKey(dataKeys, sourceData, fieldType);
        },

        applyConstraints(options, field) {
            return window.Autofiller.ConstraintsValidator.applyFieldConstraints(options, field);
        },

        createOption(value) {
            return window.Autofiller.FormDetectionService._createOption(value);
        },

        resolveBooleanValue(value, field) {
            return window.Autofiller.FormDetectionService._resolveBooleanValue(value, field);
        },

        isBooleanField(fieldType) {
            return window.Autofiller.FormDetectionService._isBooleanField(fieldType);
        },

        splitValueAcrossBoxes(value, limits) {
            return window.Autofiller.ConstraintsValidator.splitValueAcrossBoxes(value, limits);
        },

        setValue(internalId, value) {
            return window.Autofiller.Utils.withTimeout(
                window.Autofiller.FormService.setFieldValue(internalId, value),
                2000,
                'Set field ' + internalId
            );
        },

        setDate(internalId, value) {
            return window.Autofiller.Utils.withTimeout(
                window.Autofiller.FormService.setDateValue(internalId, value),
                2000,
                'Set date ' + internalId
            );
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.FieldTypeContext = FieldTypeContext;
})(window, undefined);
