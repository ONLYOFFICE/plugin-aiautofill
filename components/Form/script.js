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
                        <img src="resources/icons/button.png" alt="Find field location" />
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
                let fieldLabel = field.tag || field.identifier || 'Field ' + (index + 1);
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
