(function(window, undefined) {
    const _buttonHandlers = [];
    const _messageHandlers = [];
    let _pluginButtonInitialized = false;

    const EventBus = {
        sendPluginEvent(eventName, data) {
            if (!window.Autofiller?.Utils?.isPluginAvailable()) return false;
            
            return window.Autofiller.Utils.safeExecute(
                () => {
                    window.Asc.plugin.sendEvent(eventName, data);
                    return true;
                },
                `Error sending plugin event: ${eventName}`
            ) || false;
        },

        executeCommand(command, params = '') {
            if (!window.Autofiller?.Utils?.isPluginAvailable()) return false;
            
            return window.Autofiller.Utils.safeExecute(
                () => {
                    window.Asc.plugin.executeCommand(command, params);
                    return true;
                },
                `Error executing command: ${command}`
            ) || false;
        },

        closePlugin() {
            return this.executeCommand('close', '');
        },

        postToParent(message, origin = '*') {
            return window.Autofiller.Utils.safeExecute(
                () => {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage(message, origin);
                        return true;
                    }
                    return false;
                },
                'Error posting message to parent'
            ) || false;
        },

        attachPluginEvent(eventName, callback) {
            if (!window.Autofiller?.Utils?.isPluginAvailable()) return false;
            
            if (typeof window.Asc.plugin.attachEvent !== 'function') {
                return false;
            }

            return window.Autofiller.Utils.safeExecute(
                () => {
                    window.Asc.plugin.attachEvent(eventName, callback);
                    return true;
                },
                `Error attaching plugin event: ${eventName}`
            ) || false;
        },

        on(eventType, handler) {
            if (eventType === 'button') {
                _buttonHandlers.push(handler);
                
                if (!_pluginButtonInitialized && window.Autofiller?.Utils?.isPluginAvailable()) {
                    window.Asc.plugin.button = (id, windowId) => {
                        const context = { id, windowId };
                        for (const h of _buttonHandlers) {
                            if (h(context) === false) break;
                        }
                    };
                    _pluginButtonInitialized = true;
                }
                return true;
            }
            
            if (eventType === 'message') {
                _messageHandlers.push(handler);
                
                if (_messageHandlers.length === 1) {
                    window.addEventListener('message', (event) => {
                        const action = event.data?.action;
                        if (action) {
                            for (const h of _messageHandlers) {
                                if (h(action, event.data) === false) break;
                            }
                        }
                    });
                }
                return true;
            }
            
            return false;
        },

        off(eventType, handler) {
            if (eventType === 'button') {
                const index = _buttonHandlers.indexOf(handler);
                if (index > -1) {
                    _buttonHandlers.splice(index, 1);
                    return true;
                }
            }
            
            if (eventType === 'message') {
                const index = _messageHandlers.indexOf(handler);
                if (index > -1) {
                    _messageHandlers.splice(index, 1);
                    return true;
                }
            }
            
            return false;
        },

        clear(eventType) {
            if (eventType === 'button') {
                _buttonHandlers.length = 0;
                return true;
            }
            
            if (eventType === 'message') {
                _messageHandlers.length = 0;
                return true;
            }
            
            if (!eventType) {
                _buttonHandlers.length = 0;
                _messageHandlers.length = 0;
                return true;
            }
            
            return false;
        },

        sendAndClose(config) {
            const {
                source,
                action,
                eventName,
                eventData = {},
                beforeClose
            } = config;
            if (typeof beforeClose === 'function') {
                beforeClose();
            }

            this.sendPluginEvent(eventName, {
                action,
                ...eventData
            });

            this.postToParent({
                source,
                action,
                ...eventData
            });

            this.closePlugin();
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.EventBus = EventBus;
})(window, undefined);
