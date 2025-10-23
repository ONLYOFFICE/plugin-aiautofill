(function(window, undefined) {
    let _nextCode = null;

    const DataExtractor = {
        _isValidCallback() {
            return window.Asc?.plugin?.info?.options?.callback && 
                   typeof window.Asc.plugin.info.options.callback === 'string';
        },

        _updateNextCode() {
            if (!_nextCode && window.Asc?.plugin?.info?.options?.code) {
                _nextCode = window.Asc.plugin.info.options.code;
            }
        },

        _validateResponse(result) {
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid API response: expected object with data and code');
            }
            
            if (!result.hasOwnProperty('data')) {
                throw new Error('Invalid API response: missing "data" property');
            }
            
            if (!result.hasOwnProperty('code') || typeof result.code !== 'string') {
                throw new Error('Invalid API response: missing or invalid "code" property');
            }
        },

        async fetch() {
            try {
                if (!this._isValidCallback()) {
                    throw new Error('Invalid or missing callback URL');
                }
                
                const url = window.Asc.plugin.info.options.callback;
                this._updateNextCode();
                
                const code = _nextCode;
                _nextCode = null;
                
                const address = code ? `${url}?code=${encodeURIComponent(code)}` : url;
                const response = await fetch(address);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                this._validateResponse(result);
                
                _nextCode = result.code;
                return result.data;
            } catch (error) {
                throw new Error(`Failed to fetch data: ${error.message}`);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataExtractor = DataExtractor;
})(window, undefined);
