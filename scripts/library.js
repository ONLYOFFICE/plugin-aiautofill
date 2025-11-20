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
                .filter(f => f.identifier && f.identifier.trim())
                .map(f => f.identifier);
            
            return `Map form field identifiers to data keys.

Form Field Identifiers: ${fieldIdentifiers.join(', ')}
Available Data Keys: ${dataKeys.join(', ')}

RULES:
1. Use ONLY keys from "Available Data Keys" - DO NOT create new keys
2. Match identifiers to keys with at least 75% confidence
3. If confidence < 75%, skip that field (don't include in mapping)
4. Single match: "identifier":"dataKey"
5. Multiple matches: "identifier":["dataKey1","dataKey2"]
6. Prefer complete names over split first/last

IMPORTANT: Return ONLY valid JSON without any comments, explanations, or markdown formatting.
No // comments, no /* */ comments, no text before or after the JSON.
Format: {"mapping":{"identifier":"dataKey",...}}`;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Editor = Editor;
    window.Autofiller.Prompts = Prompts;
})(window, undefined);
