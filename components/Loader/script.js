(function(window, undefined) {
    function Loader($loaderContainer, $mainWindow, options) {
        this._init = function() {
            var defaults = {
                translate: function(text) { return text; },
                defaultMessage: 'Loading...'
            };

            this.options = Object.assign({}, defaults, options);
            this.$loaderContainer = $($loaderContainer);
            this.$mainWindow = $($mainWindow);
            this.loaderElement = null;
            this.isVisible = false;
        };

        this.show = function(message) {
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

        this.hide = function() {
            this.$mainWindow.removeClass('hidden');
            this.$loaderContainer.addClass('hidden');
            
            this._removeLoader();
            this.isVisible = false;
        };

        this._removeLoader = function() {
            if (this.loaderElement) {
                if (this.loaderElement.remove) {
                    this.loaderElement.remove();
                } else {
                    this.$loaderContainer[0].removeChild(this.loaderElement);
                }

                this.loaderElement = null;
            }
        };

        this.isShowing = function() {
            return this.isVisible;
        };

        this.updateMessage = function(message) {
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
