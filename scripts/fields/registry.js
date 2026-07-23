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
    const handlers = [];
    let defaultHandler = null;

    const Registry = {
        register(handler) {
            if (handler && handler.isDefault)
                defaultHandler = handler;
            else if (handler)
                handlers.push(handler);

            return handler;
        },

        resolve(field) {
            for (let i = 0; i < handlers.length; i++)
                if (handlers[i].match && handlers[i].match(field))
                    return handlers[i];

            return defaultHandler;
        },

        get default() {
            return defaultHandler;
        },

        enrich(field, dataKeys, sourceData) {
            const handler = this.resolve(field);
            if (handler && handler.enrich)
                return handler.enrich(field, dataKeys, sourceData);
            if (defaultHandler && defaultHandler.enrich)
                return defaultHandler.enrich(field, dataKeys, sourceData);

            return [];
        },

        apply(field) {
            const handler = this.resolve(field);
            if (handler && handler.apply)
                return handler.apply(field);
            if (defaultHandler && defaultHandler.apply)
                return defaultHandler.apply(field);

            return Promise.resolve();
        },

        getTargets(field) {
            const handler = this.resolve(field);
            return handler && handler.getTargets ? handler.getTargets(field) : null;
        },

        isSelfSufficient(field) {
            const handler = this.resolve(field);
            return !!(handler && handler.isSelfSufficient && handler.isSelfSufficient(field));
        },

        normalizeStored(field) {
            const handler = this.resolve(field);
            return handler && handler.normalizeStored ? handler.normalizeStored(field) : true;
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.FieldTypes = Registry;
})(window, undefined);
