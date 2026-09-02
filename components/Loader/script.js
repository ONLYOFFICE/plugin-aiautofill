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
    function Loader($loaderContainer, $mainWindow, options) {
        this._init = function () {
            var defaults = {
                translate: function (text) { return text; },
                defaultMessage: 'Loading...'
            };

            this.options = Object.assign({}, defaults, options);
            this.$loaderContainer = $($loaderContainer);
            this.$mainWindow = $($mainWindow);
            this.loaderElement = null;
            this.isVisible = false;
        };

        this.show = function (message) {
            let loadingText = message || this.options.defaultMessage;
            loadingText = this.options.translate(loadingText);

            this.$loaderContainer.removeClass("hidden");
            this.$mainWindow.addClass("hidden");

            if (this.loaderElement) {
                this._removeLoader();
            }

            this.$loaderContainer.html('<div class="loader"><span>' + loadingText + '</span></div>');
            this.isVisible = true;
        };

        this.hide = function () {
            this.$mainWindow.removeClass('hidden');
            this.$loaderContainer.addClass('hidden');

            this._removeLoader();
            this.isVisible = false;
        };

        this._removeLoader = function () {
            if (this.loaderElement) {
                if (this.loaderElement.remove) {
                    this.loaderElement.remove();
                } else {
                    this.$loaderContainer[0].removeChild(this.loaderElement);
                }

                this.loaderElement = null;
            }
        };

        this.isShowing = function () {
            return this.isVisible;
        };

        this.updateMessage = function (message) {
            if (this.isVisible) {
                var loadingText = message || this.options.defaultMessage;
                loadingText = this.options.translate(loadingText);
                this.$loaderContainer.html('<div class="loader"><span>' + loadingText + '</span></div>');
            }
        };

        this._init();
    }

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Loader = Loader;
})(window, undefined);
