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
(function (window) {
    /**
     * @this {LoaderInstance}
     * @param {string} $loaderContainer
     * @param {string} $mainWindow
     * @param {LoaderOptions} [options]
     */
    function Loader($loaderContainer, $mainWindow, options) {
        this._init = () => {
            var defaults = {
                translate: /** @param {string} text */ function (text) { return text; },
                defaultMessage: 'Loading...'
            };

            this.options = Object.assign({}, defaults, options);
            this.$loaderContainer = $($loaderContainer);
            this.$mainWindow = $($mainWindow);
            this.loaderElement = null;
            this.isVisible = false;
        };

        /** @param {string} [message] */
        this.show = (message) => {
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

        this.hide = () => {
            this.$mainWindow.removeClass('hidden');
            this.$loaderContainer.addClass('hidden');

            this._removeLoader();
            this.isVisible = false;
        };

        this._removeLoader = () => {
            if (this.loaderElement) {
                if (this.loaderElement.remove) {
                    this.loaderElement.remove();
                } else {
                    this.$loaderContainer[0].removeChild(this.loaderElement);
                }

                this.loaderElement = null;
            }
        };

        this.isShowing = () => {
            return this.isVisible;
        };

        /** @param {string} [message] */
        this.updateMessage = (message) => {
            if (this.isVisible) {
                var loadingText = message || this.options.defaultMessage;
                loadingText = this.options.translate(loadingText);
                this.$loaderContainer.html('<div class="loader"><span>' + loadingText + '</span></div>');
            }
        };

        this._init();
    }

    window.Autofiller = window.Autofiller || /** @type {AutofillerNamespace} */ ({});
    window.Autofiller.Loader = /** @type {LoaderConstructor} */ (/** @type {unknown} */ (Loader));
})(window);
