interface StoredValues {
    form_fields: EnrichedFormField[];
    selected_data: SelectedField[];
    original_data: OriginalValue[];
    refresh_code: string;
    original_code: string;
    theme: string;
}

interface AutofillerStorage {
    get<K extends keyof StoredValues>(key: K, defaultValue?: StoredValues[K] | null): StoredValues[K] | null;
    set<K extends keyof StoredValues>(key: K, value: StoredValues[K]): boolean;
    remove(key: keyof StoredValues): boolean;
    clear(): boolean;
    has(key: keyof StoredValues): boolean;
    keys(): string[];
    size(): number;
    pop<K extends keyof StoredValues>(key: K, defaultValue?: StoredValues[K] | null): StoredValues[K] | null;
    getAll(): Partial<StoredValues>;
    setMany(items: Partial<StoredValues>): boolean;
    createNamespace(newNamespace: string): AutofillerStorage;
}

type AutofillerStorageManager = (namespace?: string, storageEngine?: Storage | null) => AutofillerStorage;
