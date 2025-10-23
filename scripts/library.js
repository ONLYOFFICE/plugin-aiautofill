(function(window, undefined) {
    const Editor = {
        async callMethod(name, args) {
            return new Promise(resolve => {
                window.Asc.plugin.executeMethod(name, args || [], (returnValue) => {
                    resolve(returnValue);
                });
            });
        },

        async callCommand(func) {
            return new Promise(resolve => {
                window.Asc.plugin.callCommand(func, false, true, (returnValue) => {
                    resolve(returnValue);
                });
            });
        },
    };

    const Prompts = {
        getFieldMappingPrompt(dataKeys, formFields) {
            const fieldIdentifiers = formFields
                .filter(f => {
                    const identifier = f.identifier || f.key || f.tag;
                    return identifier && identifier.trim();
                })
                .map(f => f.identifier || f.key || f.tag);
            
            return `Complete this mapping by filling empty values:
Identifiers: ${fieldIdentifiers.join(',')}
Keys: ${dataKeys.join(',')}

CRITICAL: Use ONLY keys from the Keys list above. DO NOT create new keys.
Rules:
- Match identifier to best key from list
- Single key: "identifier":"key"
- Multiple options: "identifier":["key1","key2"]
- Prefer full name over first/last name split
- No match: leave "" empty
Return only JSON: {"mapping":{"identifier":"key"}}`;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Editor = Editor;
    window.Autofiller.Prompts = Prompts;
})(window, undefined);
