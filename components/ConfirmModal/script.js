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
    function ConfirmModal(options) {
        this.messages = {
            confirmReplace: "All data in the document will be replaced with the settings you previously selected.\nAre you sure you want to proceed?"
        };

        this._init = function() {
            const defaults = {
                translate: function(text) { return text; },
                message: null
            };
            this.options = Object.assign({}, defaults, options);
            this.window = null;
            this.onConfirm = null;
            this.onCancel = null;
        };

        this.show = function(onConfirm, onCancel, customMessage) {
            let me = this;
            this.onConfirm = onConfirm;
            this.onCancel = onCancel;

            const messageKey = customMessage || this.options.message || this.messages.confirmReplace;
            const message = this.options.translate(messageKey);

            const handleMessage = (event) => {
                try {
                    if (!event?.data || event.data.source !== 'confirm.html') return;

                    if (event.data.action === 'confirm' && typeof me.onConfirm === 'function') {
                        me.onConfirm();
                    } else if (event.data.action === 'cancel' && typeof me.onCancel === 'function') {
                        me.onCancel();
                    }

                    me.close();
                } finally {
                    window.removeEventListener('message', handleMessage);
                }
            };

            if (!this.window) {
                const themeParams = window.Autofiller.getThemeURLParams ? window.Autofiller.getThemeURLParams() : '';
                const variation = {
                    url: 'confirm.html' + themeParams,
                    description: this.options.translate('Note'),
                    isVisual: true,
                    buttons: [
                        { text: this.options.translate('Confirm'), primary: true },
                        { text: this.options.translate('Cancel') }
                    ],
                    isModal: true,
                    EditorsSupport: ['word', 'pdf'],
                    size: [320, 76],
                    variation: { message },
                    isDisplayedInViewer: true,
                    isViewer: true,
                };

                this.window = new window.Asc.PluginWindow();
                
                this.window.attachEvent('onInit', () => {
                    window.Autofiller.Utils.safeExecute(
                        () => this.window.sendEvent('onSetMessage', { message }),
                        'Error sending message to modal'
                    );
                });

                this.window.attachEvent('onClose', () => {
                    if (this.window) {
                        window.Autofiller.Utils.safeExecute(
                            () => this.window.close(),
                            'Error closing modal window'
                        );
                    }

                    me.window = null;
                    window.removeEventListener('message', handleMessage);
                });

                window.addEventListener('message', handleMessage);
                this.window.show(variation);
            }

            return this.window;
        };

        this.close = function() {
            if (this.window) {
                window.Autofiller.Utils.safeExecute(
                    () => this.window.close(),
                    'Error closing modal window'
                );
                
                this.window = null;
            }
        };

        this.getWindow = function() {
            return this.window;
        };

        this.isShowing = function() {
            return this.window !== null;
        };

        this._init();
    }

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.ConfirmModal = ConfirmModal;
})(window, undefined);
