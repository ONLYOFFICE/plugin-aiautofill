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

    const DEFAULT_RE = /^(?:text|field|input|value|column|col|row|item|data|node|element|cell|label|name|key|var|prop|attr)[a-z]{0,6}\d+$/i;

    const Prompts = {
        filterMeaningfulFields(formFields) {
            return formFields.filter(f => f.identifier && f.identifier.trim() && !DEFAULT_RE.test(f.identifier.trim()));
        },

        getFieldMappingPrompt(dataKeys, formFields) {
            const fieldIdentifiers = formFields
                .filter(f => f.identifier && f.identifier.trim())
                .map(f => f.identifier);

            return `You are an expert in data mapping and structure analysis.

## TASK
Map EVERY form field to the most relevant available data key(s). Prefer an approximate match over no match — it is always better to suggest a candidate than to leave a field empty.

## INPUT DATA

### Form field keys:
${fieldIdentifiers.join(', ')}

### Available data keys:
${dataKeys.join('\n')}

## MAPPING RULES

1. **Exhaustive**: Map as many form fields as possible. Only omit a field if NO data key has any plausible relationship to it.
2. **Use what exists**: Use ONLY existing keys listed above — do NOT invent new keys.
3. **Fuzzy match allowed**: Partial, semantic, or contextual matches are acceptable (e.g. "Position" → a job-title key, "CompanyName1" → a company-name key).
4. **Numbered/indexed fields**: Fields ending in a number (e.g. CompanyName1, CompanyName2, JobTitle1, Description3) represent repeated slots — map them all to the same data key(s) as the un-numbered equivalent.
5. **One-to-many**: If multiple data keys suit one form field, include all of them as an array: \`"FieldName": ["key1", "key2"]\`.
6. **Many-to-one**: The same data key can be reused across multiple form fields.
7. **Type guidance**: Prefer keys whose type hint matches the field's expected content (date fields → date keys, etc.).

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
