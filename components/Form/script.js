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
    function Form(formFields, options) {
        this._templates = {
            option: function(option) {
                const value = typeof option === 'object' ? (option.value || '') : option;
                const label = typeof option === 'object' ? (option.label || option.value || '') : option;
                
                const cleanValue = String(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanLabel = String(label).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
                
                const escapedValue = cleanValue.replace(/"/g, '&quot;');
                const escapedLabel = cleanLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                return `<option value="${escapedValue}">${escapedLabel}</option>`;
            },

            options: function(options) {
                return (options || []).map(this.option).join('');
            },

            field: function(field, fieldLabel, optionsHTML) {
                var tr = (window.Asc && window.Asc.plugin && window.Asc.plugin.tr) ? window.Asc.plugin.tr : function(t){return t;};
                return `<div class="form-field">
                    <div class="field-checkbox-label-wrapper">
                        <input type="checkbox" class="field-checkbox" checked data-field-id="${field.internalId}">
                        <label class="field-label">${fieldLabel}</label>
                    </div>
                    <div class="field-input-container">
                        <select class="field-input" data-field-id="${field.internalId}">
                            ${optionsHTML}
                        </select>
                    </div>
                    <div class="field-icon" data-tooltip="${tr('Find field location')}" data-field-id="${field.internalId}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 9.9V5.7C17 5.3134 16.7015 5 16.3333 5H7.66667C7.29848 5 7 5.3134 7 5.7V17.6C7 17.9866 7.29848 18.3 7.66667 18.3H9.66667M9 7.8H15M9 10.6H11.6667M9 13.4H9.66667M16.6667 17.6L18 19M14.3333 16.9V14.1M14.3333 14.1H13M14.3333 14.1H15.6667M17.3333 15.15C17.3333 16.8897 15.9902 18.3 14.3333 18.3C12.6765 18.3 11.3333 16.8897 11.3333 15.15C11.3333 13.4103 12.6765 12 14.3333 12C15.9902 12 17.3333 13.4103 17.3333 15.15Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>`;
            }
        };

        this._init = function() {
            const defaults = {
                containerSelector: '#formFields',
                selectAllSelector: '#selectAll'
            };
            this._options = Object.assign({}, defaults, options);
            this._formFields = formFields || [];
            this.$container = $(this._options.containerSelector);
            this.$selectAll = $(this._options.selectAllSelector);
        };

        this._initializeSelect = function() {
            $('.field-input').select2({
                minimumResultsForSearch: Infinity,
                width: '100%',
                dropdownAutoWidth: false,
                dropdownCssClass: 'select2-dropdown--fixed',
                templateResult: function(option) {
                    if (!option.id) {
                        return option.text;
                    }
                    const cleanText = String(option.text || '')
                        .replace(/[\r\n]+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    const $option = $('<span></span>').text(cleanText);
                    $option.attr('title', cleanText);
                    return $option;
                },
                templateSelection: function(option) {
                    const cleanText = String(option.text || '')
                        .replace(/[\r\n]+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    const $selection = $('<span></span>').text(cleanText);
                    $selection.attr('title', cleanText);
                    return $selection;
                }
            });
        };

        this._updateApplyButtonState = function() {
            let $allCheckboxes = $('.field-checkbox');
            let checkedCount = $allCheckboxes.filter(':checked').length;
            let $applyBtn = $('#applyBtn');
            
            if ($applyBtn.length) $applyBtn.prop('disabled', checkedCount === 0);
        };

        this._attachEventListeners = function() {
            let me = this;

            if (this.$selectAll.length) {
                this.$selectAll.off('change').on('change', function() {
                    let isChecked = $(this).prop('checked');
                    $('.field-checkbox').prop('checked', isChecked);
                    me._updateApplyButtonState();
                });
            }

            $('.field-checkbox').off('change').on('change', function() {
                let $allCheckboxes = $('.field-checkbox');
                let $selectAll = $('#selectAll');
                let checkedCount = $allCheckboxes.filter(':checked').length;

                if (checkedCount === $allCheckboxes.length) {
                    $selectAll.prop('checked', true).prop('indeterminate', false);
                } else if (checkedCount === 0) {
                    $selectAll.prop('checked', false).prop('indeterminate', false);
                } else {
                    $selectAll.prop('checked', false).prop('indeterminate', true);
                }
                
                me._updateApplyButtonState();
            });

            $('.field-icon').off('click').on('click', function() {
                let fieldId = $(this).attr('data-field-id');
                if (fieldId && window.Asc && window.Asc.plugin && window.Asc.plugin.executeCommand) {
                    window.Asc.plugin.executeMethod("SelectContentControl", [fieldId]);
                }
            });

            $('.field-icon[data-tooltip]').off('mouseenter').on('mouseenter', function() {
                const rect = this.getBoundingClientRect();
                const tooltipTop = rect.top;
                
                const tooltipText = $(this).attr('data-tooltip');
                const approxTooltipWidth = tooltipText.length * 6 + 16;
                
                let tooltipLeft = rect.left + (rect.width / 2);
                const tooltipLeftEdge = tooltipLeft - (approxTooltipWidth / 2);
                
                if (tooltipLeftEdge < 5) {
                    tooltipLeft = (approxTooltipWidth / 2) + 5;
                }
                
                const tooltipRightEdge = tooltipLeft + (approxTooltipWidth / 2);
                if (tooltipRightEdge > window.innerWidth - 5) {
                    tooltipLeft = window.innerWidth - (approxTooltipWidth / 2) - 5;
                }
                
                this.style.setProperty('--tooltip-top', tooltipTop + 'px');
                this.style.setProperty('--tooltip-left', tooltipLeft + 'px');
            });
        };

        this.populateFormFields = function() {
            if (!this.$container.length || !this._formFields.length) {
                return;
            }

            this.$container.empty();

            this._formFields.forEach((field, index) => {
                let options = field.generatedOptions || [];
                let fieldLabel = field.key || field.tag || field.tip || field.placeholder || 'Field ' + (index + 1);
                let optionsHTML = this._templates.options(options);
                
                let fieldHTML = this._templates.field(field, fieldLabel, optionsHTML);

                this.$container.append(fieldHTML);
            });

            this._initializeSelect();
            this._attachEventListeners();
            this._updateApplyButtonState();
        };

        this.collectSelectedData = function() {
            let selectedData = [];
            let me = this;

            $('.field-checkbox:checked').each(function() {
                let $checkbox = $(this);
                let fieldId = $checkbox.attr('data-field-id');
                let $select = $('.field-input[data-field-id="' + fieldId + '"]');
                let $label = $checkbox.next('label');

                if ($select.length && $label.length) {
                    let field = me._formFields.find(function(f) {
                        return f.internalId === fieldId;
                    });

                    selectedData.push({
                        fieldId: fieldId,
                        label: $label.text().trim(),
                        value: $select.val().trim(),
                        type: field ? field.type : 'text'
                    });
                }
            });

            return selectedData;
        };

        this._init();
    }

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Form = Form;
})(window, undefined);
