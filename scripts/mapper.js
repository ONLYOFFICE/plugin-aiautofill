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
    const DataMappingService = {
        _extractResponseContent(aiResponse) {
            if (typeof aiResponse === 'object' && aiResponse?.choices?.[0])
                return aiResponse.choices[0].message.content;
            return aiResponse;
        },

        _removeComments(jsonString) {
            return jsonString
                .replace(/\/\/[^\n]*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '');
        },

        _wrapInMappingObject(content) {
            return `{"mapping":${content}}`;
        },

        _extractJSONCandidates(content) {
            if (typeof content !== 'string')
                return [content];

            const cleanedContent = content.replace(/```(?:json)?\s*/g, '').trim();
            const candidates = [];

            const fullObject = cleanedContent.match(/\{\s*"mapping"\s*:[\s\S]*\}/);
            if (fullObject)
                candidates.push(this._removeComments(fullObject[0]));

            const mappingContent = cleanedContent.match(/\{\s*"mapping"\s*:\s*\{[\s\S]*?\}\s*\}/);
            if (mappingContent)
                candidates.push(this._removeComments(mappingContent[0]));

            const partialMappingContent = cleanedContent.match(/"mapping"\s*:\s*(\{[\s\S]*?\})/);
            if (partialMappingContent)
                candidates.push(this._removeComments(this._wrapInMappingObject(partialMappingContent[1])));

            candidates.push(content);
            return candidates;
        },

        _createEmptyMapping(reasoning) {
            const translator = window.Asc?.plugin?.tr;
            return {
                mapping: {},
                reasoning: translator ? translator(reasoning) : reasoning
            };
        },

        extractAllKeys(data, prefix = '', maxDepth = 5, currentDepth = 0) {
            const keys = [];

            if (!data || typeof data !== 'object' || Array.isArray(data) || currentDepth >= maxDepth)
                return keys;

            for (const key in data) {
                if (!data.hasOwnProperty(key)) continue;

                const fullKey = prefix ? `${prefix}.${key}` : key;
                const value = data[key];

                if (value && typeof value === 'object' && !Array.isArray(value))
                    keys.push(...this.extractAllKeys(value, fullKey, maxDepth, currentDepth + 1));
                else if (Array.isArray(value) && value.length > 0 &&
                    typeof value[0] === 'object' && value[0] !== null)
                    keys.push(...this.extractAllKeys(value[0], fullKey, maxDepth, currentDepth + 1));
                else
                    keys.push(fullKey);
            }

            return [...new Set(keys)];
        },

        parseAIResponse(aiResponse) {
            const content = this._extractResponseContent(aiResponse);
            const candidates = this._extractJSONCandidates(content);
            for (const candidate of candidates) {
                try {
                    const parsed = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
                    if (parsed && parsed.mapping) {
                        return parsed;
                    }
                } catch (error) { }
            }

            return this._createEmptyMapping('No valid mapping found');
        },
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataMappingService = DataMappingService;
})(window, undefined);
