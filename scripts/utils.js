(function(window, undefined) {
    const Utils = {
        safeExecute(fn, errorMsg) {
            try {
                return fn();
            } catch (e) {
                console.error(errorMsg, e);
                return null;
            }
        },

        isPluginAvailable() {
            return window.Asc?.plugin;
        },

        getDecodedURLParam(param) {
            const params = new URLSearchParams(window.location.search);
            const value = params.get(param);
            return value ? decodeURIComponent(value) : null;
        },

        withTimeout(promise, timeoutMs, operationName = 'Operation') {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
        },
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Utils = Utils;
})(window, undefined);
