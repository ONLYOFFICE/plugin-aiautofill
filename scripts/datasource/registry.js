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
    const SELECTED_KEY = 'selected_source';
    const SOURCE_DATA_KEY = 'source_data';
    const SOURCE_DATA_ID_KEY = 'source_data_id';
    const sources = [];
    let _selectedId = null;

    function getStorage() {
        return window.Autofiller.DataSourceContext
            ? window.Autofiller.DataSourceContext.getStorage()
            : null;
    }

    const Registry = {
        register(source) {
            if (source)
                sources.push(source);

            return source;
        },

        get(id) {
            return sources.find(source => source.id === id) || null;
        },

        get sources() {
            return sources.slice();
        },

        listSelectable() {
            return sources
                .filter(source => source.requiresFile || (source.isAvailable && source.isAvailable()))
                .map(source => ({ id: source.id, label: source.label || source.id, requiresFile: !!source.requiresFile }));
        },

        select(id) {
            _selectedId = id || null;

            const source = this.get(_selectedId);
            if (!source?.cacheable)
                this.clearCachedData();

            const storage = getStorage();
            if (storage) {
                if (_selectedId)
                    storage.set(SELECTED_KEY, _selectedId);
                else
                    storage.remove(SELECTED_KEY);
            }

            return _selectedId;
        },

        getSelectedId() {
            if (_selectedId)
                return _selectedId;

            const storage = getStorage();
            if (storage)
                _selectedId = storage.get(SELECTED_KEY) || null;

            return _selectedId;
        },

        saveCachedData(id, data) {
            const storage = getStorage();
            const source = this.get(id);
            if (!storage || !source?.cacheable || data == null)
                return;

            storage.set(SOURCE_DATA_KEY, data);
            storage.set(SOURCE_DATA_ID_KEY, id);
        },

        getCachedData() {
            const storage = getStorage();
            if (!storage)
                return null;

            const id = this.getSelectedId();
            const source = this.get(id);
            if (!source?.cacheable)
                return null;

            const cachedId = storage.get(SOURCE_DATA_ID_KEY);
            if (!id || id !== cachedId)
                return null;

            return storage.get(SOURCE_DATA_KEY);
        },

        clearCachedData() {
            const storage = getStorage();
            if (!storage)
                return;

            storage.remove(SOURCE_DATA_KEY);
            storage.remove(SOURCE_DATA_ID_KEY);
        },

        clearSession() {
            const source = this.get(this.getSelectedId());
            if (source?.clear)
                source.clear();
        },

        resolve() {
            const id = this.getSelectedId();
            if (id) {
                const selected = this.get(id);
                if (selected && selected.isAvailable && selected.isAvailable())
                    return selected;

                return null;
            }

            for (let i = 0; i < sources.length; i++)
                if (sources[i].isAvailable && sources[i].isAvailable())
                    return sources[i];

            return null;
        },

        async fetch() {
            try {
                const selectedId = this.getSelectedId();
                const source = this.resolve();

                if (!source) {
                    const cached = this.getCachedData();
                    if (cached)
                        return cached;

                    throw new Error('No data source configured. Load a JSON file or provide "callback" in plugin options.');
                }

                const data = await source.fetch();
                if (source.cacheable)
                    this.saveCachedData(selectedId, data);

                return data;
            } catch (error) {
                if (error.status)
                    throw error;
                throw new Error(`Failed to fetch data: ${error.message}`);
            }
        }
    };

    window.Autofiller = window.Autofiller || {};
    window.Autofiller.DataSources = Registry;
})(window, undefined);
