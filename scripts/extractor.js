(function(window, undefined) {
    let _nextCode = null;
    const STORAGE_KEY = 'refresh_code';

    const DataExtractor = {
        _isValidCallback() {
            return window.Asc?.plugin?.info?.options?.callback && 
                   typeof window.Asc.plugin.info.options.callback === 'string';
        },

        _getStorage() {
            if (typeof window.Autofiller?.StorageManager === 'function')
                return window.Autofiller.StorageManager('autofiller');
            return null;
        },

        _loadNextCode() {
            if (_nextCode)
                return _nextCode;

            const storage = this._getStorage();
            if (storage) {
                const storedCode = storage.get(STORAGE_KEY);
                if (storedCode) {
                    _nextCode = storedCode;
                    return _nextCode;
                }
            }

            if (window.Asc?.plugin?.info?.options?.code)
                _nextCode = window.Asc.plugin.info.options.code;

            return _nextCode;
        },

        _saveNextCode(code) {
            _nextCode = code;
            const storage = this._getStorage();
            if (storage && code)
                storage.set(STORAGE_KEY, code);
        },

        _updateNextCode() {
            this._loadNextCode();
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
                    const error = new Error(`HTTP error! status: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }
                
                const result = await response.json();
                this._validateResponse(result);
                this._saveNextCode(result.code);

                return result.data;
            } catch (error) {
                if (error.status)
                    throw error;
                throw new Error(`Failed to fetch data: ${error.message}`);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataExtractor = DataExtractor;
})(window, undefined);
