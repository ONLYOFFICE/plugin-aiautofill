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

            return `You are an expert in data mapping and structure analysis.

## TASK
Analyze two arrays of keys and create a mapping between available data and form fields.

## INPUT DATA

### Form field keys:
${fieldIdentifiers.join(', ')}

### Available data keys:
${dataKeys.join(', ')}

## MAPPING RULES

1. **Use what exists**: Use ONLY existing keys from "INPUT DATA" - DO NOT create new keys
2. **Exact match**: Key should match exactly or be very similar (considering case, underscores, camelCase)
3. **Full names preferred**: Prefer using complete names where possible over split first/last
4. **Partial match**: Part of data key corresponds to form field (e.g., "user_first_name" → "firstName")
5. **Data type**: Respect data types (e.g., use strings for text fields, numbers for salary, etc.)
6. **One-to-many**: One data key can fill multiple form fields, include all possible matching keys in the mapping as an array ("form_field":["data_key1","data_key2"])
7. **Priority**: If there are multiple candidates for the same form field, select the most appropriate one first, but if all are valid, include all of them

## CONFIDENCE THRESHOLD
**Only include mappings with confidence ≥ 75%**

## RESPONSE FORMAT

Return **ONLY** valid JSON:
\`\`\`json
{"mapping":{"form_field_name":"data_key_name",...}}
\`\`\`

CRITICAL: Return **ONLY** valid JSON without any additional explanations, comments, no additional text or markdown formatting!
No // comments, no /* */ comments, no text before or after the JSON.`;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Editor = Editor;
    window.Autofiller.Prompts = Prompts;
})(window, undefined);
