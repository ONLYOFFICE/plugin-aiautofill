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
    function collectForms() {
        const doc = Api.GetDocument();
        const forms = doc.GetAllForms();
        const processedIds = new Set();
        const formData = [];
        const radioGroups = {};

        function isImageField(form) {
            const type = form.GetFormType ? form.GetFormType() : 'unknown';
            return ['pictureForm', 'signatureForm'].indexOf(type) !== -1;
        }

        function getTip(form) {
            if (form.GetTipText) return form.GetTipText() || '';
            return '';
        }

        function getPlaceholder(form) {
            if (form.GetPlaceholderText) return form.GetPlaceholderText() || '';
            return '';
        }

        function getLabel(form) {
            if (form.GetLabel) return form.GetLabel() || '';
            return '';
        }

        function getFormConstraints(form, type) {
            var constraints = {};
            try {
                if (type === 'textForm') {
                    if (form.GetFormat) {
                        const fmt = form.GetFormat();
                        if (fmt && fmt.type)
                            constraints.format = { type: fmt.type, value: fmt.value != null ? fmt.value : '' };
                    }

                    if (form.GetCharactersLimit)
                        constraints.charactersLimit = form.GetCharactersLimit();

                    if (form.GetAllowedSymbols)
                        constraints.allowedSymbols = form.GetAllowedSymbols() || '';

                    if (form.IsComb)
                        constraints.isComb = !!form.IsComb();
                } else if (type === 'comboBoxForm' || type === 'dropDownForm') {
                    if (form.GetListValues)
                        constraints.listValues = form.GetListValues() || [];
                    constraints.isEditable = (type === 'comboBoxForm' && form.IsEditable) ? !!form.IsEditable() : false;
                } else if (type === 'dateForm') {
                    if (form.GetFormat) {
                        const dateFormat = form.GetFormat();
                        constraints.dateFormat = (dateFormat && typeof dateFormat === 'object') ? dateFormat.value : dateFormat;
                    }
                }
            } catch (e) { }

            return constraints;
        }

        function addRadioButton(form) {
            const groupKey = (form.GetRadioGroup && form.GetRadioGroup())
                || (form.GetFormKey && form.GetFormKey()) || '';
            const id = form.GetInternalId ? form.GetInternalId() : null;
            if (!groupKey || !id)
                return;

            if (!radioGroups[groupKey]) {
                radioGroups[groupKey] = {
                    Key: groupKey,
                    Tag: form.GetTag ? form.GetTag() : '',
                    Label: getLabel(form),
                    Placeholder: getPlaceholder(form),
                    Tip: getTip(form),
                    Lock: form.IsFixed ? (form.IsFixed() ? 0 : null) : null,
                    Selected: form.GetGroupValue ? (form.GetGroupValue() || '') : '',
                    Choices: []
                };
            }

            radioGroups[groupKey].Choices.push({
                Choice: form.GetChoiceName ? (form.GetChoiceName() || '') : '',
                InternalId: id
            });
        }

        function populateFormData(form, parentKey = null) {
            const formId = form.GetInternalId ? form.GetInternalId() : null;
            if (!formId || processedIds.has(formId))
                return;

            if (isImageField(form))
                return;

            if (form.IsRadioButton && form.IsRadioButton()) {
                processedIds.add(formId);
                addRadioButton(form);
                return;
            }

            processedIds.add(formId);
            const type = form.GetFormType ? form.GetFormType() : 'unknown';
            const key = parentKey !== null ? parentKey : (form.GetFormKey ? form.GetFormKey() : null);

            formData.push({
                InternalId: formId,
                Key: key,
                Tag: form.GetTag ? form.GetTag() : '',
                Label: getLabel(form),
                Placeholder: getPlaceholder(form),
                Tip: getTip(form),
                Type: type,
                Text: form.GetText ? form.GetText() : '',
                Lock: form.IsFixed ? (form.IsFixed() ? 0 : null) : null,
                Constraints: getFormConstraints(form, type)
            });
        }

        function processSubForms(form) {
            let hasSubForms = false;
            const parentKey = form.GetFormKey ? form.GetFormKey() : null;

            if (form.GetSubForms && typeof form.GetSubForms === 'function') {
                try {
                    const subForms = form.GetSubForms();
                    if (subForms && subForms.length > 0) {
                        hasSubForms = true;
                        subForms.forEach(subForm => {
                            populateFormData(subForm, parentKey);
                            processSubForms(subForm);
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            return hasSubForms;
        }

        function emitRadioGroups() {
            Object.keys(radioGroups).forEach(function (groupKey) {
                const group = radioGroups[groupKey];
                const choiceNames = group.Choices
                    .map(function (choice) { return choice.Choice; })
                    .filter(function (choice) { return choice !== ''; });

                formData.push({
                    InternalId: group.Choices.length ? group.Choices[0].InternalId : groupKey,
                    Key: group.Key,
                    Tag: group.Tag,
                    Label: group.Label || '',
                    Placeholder: group.Placeholder,
                    Tip: group.Tip,
                    Type: 'radioGroupForm',
                    Text: group.Selected,
                    Lock: group.Lock,
                    IsRadioGroup: true,
                    Choices: group.Choices,
                    GroupValue: group.Selected,
                    Constraints: { listValues: choiceNames, isEditable: false }
                });
            });
        }

        function collectLeafSubforms(form, leaves) {
            if (!form.GetSubForms)
                return;

            let subForms;
            try {
                subForms = form.GetSubForms() || [];
            } catch (e) {
                subForms = [];
            }

            subForms.forEach(function (subForm) {
                if (isImageField(subForm))
                    return;

                let nested = [];
                if (subForm.GetSubForms) {
                    try {
                        nested = subForm.GetSubForms() || [];
                    } catch (e) {
                        nested = [];
                    }
                }

                if (nested.length > 0)
                    collectLeafSubforms(subForm, leaves);
                else
                    leaves.push(subForm);
            });
        }

        function handleComplexField(form) {
            const parentId = form.GetInternalId ? form.GetInternalId() : null;
            if (!parentId || processedIds.has(parentId))
                return;

            const parentKey = form.GetFormKey ? form.GetFormKey() : null;
            const leaves = [];

            collectLeafSubforms(form, leaves);
            if (leaves.length === 0)
                return;

            const subFields = leaves
                .map(function (subField) {
                    var subFieldType = subField.GetFormType ? subField.GetFormType() : 'unknown';
                    return {
                        InternalId: subField.GetInternalId ? subField.GetInternalId() : null,
                        Type: subFieldType,
                        Constraints: getFormConstraints(subField, subFieldType)
                    };
                })
                .filter(function (subField) { return subField.InternalId; });

            const isThousandsGroup = subFields.length >= 2 && subFields.every(function (subField) {
                const constraints = subField.Constraints || {};
                return constraints.format && constraints.format.type === 'digit'
                    && typeof constraints.charactersLimit === 'number'
                    && constraints.charactersLimit > 0 && constraints.charactersLimit <= 3;
            });

            if (!isThousandsGroup) {
                leaves.forEach(function (subField) {
                    populateFormData(subField, parentKey);
                });

                return;
            }

            processedIds.add(parentId);
            subFields.forEach(function (subField) {
                processedIds.add(subField.InternalId);
            });

            const totalLimit = subFields.reduce(function (sum, subField) {
                return sum + subField.Constraints.charactersLimit;
            }, 0);

            formData.push({
                InternalId: parentId,
                Key: parentKey,
                Tag: form.GetTag ? form.GetTag() : '',
                Label: getLabel(form),
                Placeholder: getPlaceholder(form),
                Tip: getTip(form),
                Type: 'complexForm',
                Text: form.GetText ? form.GetText() : '',
                Lock: form.IsFixed ? (form.IsFixed() ? 0 : null) : null,
                IsComplex: true,
                SubFields: subFields,
                Constraints: { format: { type: 'digit', value: '' }, charactersLimit: totalLimit }
            });
        }

        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            const type = form.GetFormType ? form.GetFormType() : 'unknown';

            if (type === 'complexForm') {
                handleComplexField(form);
                continue;
            }

            const hasSubForms = processSubForms(form);
            if (!hasSubForms) {
                populateFormData(form);
            }
        }

        emitRadioGroups();

        return formData;
    }

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.FieldDetection = { collectForms };
})(window, undefined);
