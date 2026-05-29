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

            return `You are an expert data mapping AI. Map EVERY form field below to the most relevant available data key(s). Prefer approximate matches over leaving a field empty — it is always better to suggest a candidate than to leave a field empty.
## INPUT DATA
Form fields: ${fieldIdentifiers.join(', ')}
Available keys: ${dataKeys.join('\n')}
## MAPPING RULES
1. **Exhaustive**: Only omit a field if zero relationship exists.
2. **Strict Keys**: Use ONLY the keys listed above — do NOT invent or modify any key.
3. **Fuzzy Match**: Semantic, partial, or contextual matches are allowed (e.g. "Position" → job-title key, "CompanyName1" → company-name key).
4. **Numbered Fields**: Fields ending in a number (e.g. JobTitle1, JobTitle2) represent repeated slots — map them all to the same data key(s) as the un-numbered equivalent.
5. **Cardinality**: Output single strings or arrays for multiple matches ('"field": ["k1", "k2"]'). Reusing keys is allowed.
6. **Type Match**: Prefer matching data types (e.g., date to date).
## OUTPUT FORMAT
Return raw, valid JSON only. No markdown, code blocks, explanations, comments, or // and /* */ inside JSON.
{"mapping":{"form_field_name":"data_key_name","another_field":["key1","key2"]}}`;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Editor = Editor;
    window.Autofiller.Prompts = Prompts;
})(window, undefined);
