(function(window, undefined) {
    const StorageManager = (namespace = 'autofiller', storageEngine = null) => {
        const storage = storageEngine || (typeof window !== 'undefined' && window.localStorage) || null;
        
        if (!storage)
            console.warn('Storage not available, operations will be no-ops');

        const _getKey = (key) => {
            return `${namespace}_${key}`;
        };

        return {
            get(key, defaultValue = null) {
                if (!storage) {
                    console.warn(`Storage unavailable: Cannot get "${key}"`);
                    return defaultValue;
                }
                
                try {
                    const namespacedKey = _getKey(key);
                    const item = storage.getItem(namespacedKey);
                    
                    if (item === null) {
                        return defaultValue;
                    }
                    
                    try {
                        return JSON.parse(item);
                    } catch (parseError) {
                        return item;
                    }
                } catch (error) {
                    return defaultValue;
                }
            },

            set(key, value) {
                if (!storage) {
                    console.warn(`Storage unavailable: Cannot set "${key}"`);
                    return false;
                }
                
                try {
                    const namespacedKey = _getKey(key);
                    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
                    storage.setItem(namespacedKey, serializedValue);
                    return true;
                } catch (error) {
                    return false;
                }
            },

            remove(key) {
                if (!storage) {
                    console.warn(`Storage unavailable: Cannot remove "${key}"`);
                    return false;
                }
                
                try {
                    const namespacedKey = _getKey(key);
                    storage.removeItem(namespacedKey);
                    return true;
                } catch (error) {
                    return false;
                }
            },

            clear() {
                if (!storage) {
                    console.warn('Storage unavailable: Cannot clear');
                    return false;
                }
                
                try {
                    const keysToRemove = [];
                    const prefix = `${namespace}_`;
                    
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key && key.startsWith(prefix)) {
                            keysToRemove.push(key);
                        }
                    }
                    
                    keysToRemove.forEach(key => storage.removeItem(key));
                    return true;
                } catch (error) {
                    return false;
                }
            },

            has(key) {
                if (!storage) {
                    return false;
                }
                
                try {
                    const namespacedKey = _getKey(key);
                    return storage.getItem(namespacedKey) !== null;
                } catch (error) {
                    return false;
                }
            },

            keys() {
                if (!storage) {
                    return [];
                }
                
                try {
                    const keys = [];
                    const prefix = `${namespace}_`;
                    
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key && key.startsWith(prefix)) {
                            keys.push(key.substring(prefix.length));
                        }
                    }
                    
                    return keys;
                } catch (error) {
                    console.error('Error getting storage keys:', error.message);
                    return [];
                }
            },

            size() {
                return this.keys().length;
            },

            pop(key, defaultValue = null) {
                const value = this.get(key, defaultValue);
                this.remove(key);
                return value;
            },

            getAll() {
                const items = {};
                const keys = this.keys();
                
                keys.forEach(key => {
                    items[key] = this.get(key);
                });
                
                return items;
            },

            setMany(items) {
                if (!items || typeof items !== 'object') {
                    return false;
                }
                
                let success = true;
                Object.entries(items).forEach(([key, value]) => {
                    if (!this.set(key, value)) {
                        success = false;
                    }
                });
                
                return success;
            },

            createNamespace(newNamespace) {
                return StorageManager(newNamespace, storage);
            }
        };
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.StorageManager = StorageManager;
})(window, undefined);
