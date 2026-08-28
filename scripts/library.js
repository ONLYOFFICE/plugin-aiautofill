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
(function (window, undefined) {
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

    const DEFAULT_RE = /^(?:text|field|input|value|column|col|row|item|data|node|element|cell|label|name|key|var|prop|attr|check(?:box)?|drop(?:down)?|combo(?:box)?|list(?:box)?|radio|choice|option|select|date|pic(?:ture)?)[a-z]{0,6}\d+$/i;

    function _cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    const Prompts = {
        isGenericIdentifier(name) {
            return DEFAULT_RE.test(_cleanText(name));
        },

        filterMeaningfulFields(formFields) {
            return formFields.filter(f => {
                const identifier = f.identifier && f.identifier.trim();
                if (!identifier)
                    return false;
                if (!DEFAULT_RE.test(identifier))
                    return true;
                return !!(_cleanText(f.tip) || _cleanText(f.placeholder));
            });
        },

        getFieldMappingPrompt(dataKeys, formFields) {
            const seenLines = new Set();
            const fieldLines = [];
            formFields
                .filter(f => f.identifier && f.identifier.trim())
                .forEach(f => {
                    const name = _cleanText(f.identifier);
                    const hint = [_cleanText(f.tip), _cleanText(f.placeholder)]
                        .find(t => t && t.toLowerCase() !== name.toLowerCase()) || '';
                    let line = `- name: "${name}"`;
                    if (hint)
                        line += `, hint: "${hint}"`;
                    if (f.type && f.type !== 'unknown')
                        line += `, type: ${f.type}`;

                    if (!seenLines.has(line)) {
                        seenLines.add(line);
                        fieldLines.push(line);
                    }
                });

            return `You are an expert data mapping AI. Map form fields to the best available data key(s) from the list below.
## INPUT DATA
Form fields (one per line; "hint" describes the field's purpose, "type" is the form field type — both are context only):
${fieldLines.join('\n')}
Available keys: ${dataKeys.join('\n')}
## MAPPING RULES
1. **Exhaustive**: Only omit a field if zero relationship exists.
2. **Strict Keys**: Use ONLY the keys listed above — do NOT invent or modify any key.
3. **Field Names**: Use each field's "name" EXACTLY as the JSON key — never its hint or type.
4. **Use Hints**: When a field name is generic (e.g. "Text11"), rely on its hint to find the matching key (e.g. hint "Please enter a nationality" - nationality key).
5. **Fuzzy Match**: Semantic, partial, or contextual matches are allowed (e.g. "Position" - job-title key, "CompanyName1" - company-name key).
6. **Numbered Fields**: Fields ending in a number (e.g. JobTitle1, JobTitle2) represent repeated slots — map them all to the same data key(s) as the un-numbered equivalent.
7. **Cardinality**: Output single strings or arrays for multiple matches ('"field": ["k1", "k2"]'). Reusing keys is allowed.
8. **Type Match**: Prefer matching data types (e.g., date to date).
9. **Confidence**: You confidence level for each mapping must be more than 80%.
## OUTPUT FORMAT
Return raw, valid JSON only. No markdown, code blocks, explanations, comments, or // and /* */ inside JSON.
{"mapping":{"form_field_name":"data_key_name","another_field":["key1","key2"]}}`;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.Editor = Editor;
    window.Autofiller.Prompts = Prompts;
})(window, undefined);
