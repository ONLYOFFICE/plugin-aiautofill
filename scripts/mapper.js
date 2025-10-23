(function(window, undefined) {
    const DataMappingService = {
        _extractResponseContent(aiResponse) {
            if (typeof aiResponse === 'object' && aiResponse?.choices?.[0])
                return aiResponse.choices[0].message.content;
            return aiResponse;
        },

        _sanitizeJSON(content) {
            if (typeof content !== 'string')
                return content;
            
            content = content.replace(/```(?:json)?\s*/g, '').trim();
            
            let match = content.match(/\{\s*"mapping"\s*:\s*\{[\s\S]*?\}\s*\}/);
            if (match)
                return match[0];
            
            match = content.match(/"mapping"\s*:\s*(\{[\s\S]*?\})/);
            if (match)
                return `{"mapping":${match[1]}}`;
            
            match = content.match(/\{[\s\S]*?\}/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[0]);
                    if (parsed.mapping) return match[0];
                    return `{"mapping":${match[0]}}`;
                } catch (e) {
                }
            }
            
            return content;
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
            try {
                const content = this._extractResponseContent(aiResponse);
                const sanitizedContent = this._sanitizeJSON(content);
                const parsedMapping = typeof sanitizedContent === 'string' 
                    ? JSON.parse(sanitizedContent) 
                    : sanitizedContent;
                
                return parsedMapping && parsedMapping.mapping 
                    ? parsedMapping 
                    : this._createEmptyMapping('No valid mapping found');
            } catch (error) {
                return this._createEmptyMapping(`Parse failed: ${error.message}`);
            }
        },
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataMappingService = DataMappingService;
})(window, undefined);
