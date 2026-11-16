/**
 * Smoke tests for the AI Auto Fill plugin.
 *
 * Run: `make test` (or `node --test tests/`). Requires Node.js >= 18, no npm deps.
 *
 * The plugin has no module system: every file in scripts/ is an IIFE that attaches
 * itself to `window.Autofiller`. These tests load the real source files into a
 * Node `vm` context with fake `window`, `localStorage`, `fetch`, `Asc.plugin`
 * and document-side `Api` objects, then drive the main user scenarios:
 *   1. field detection (collectForms, runs inside the editor via callCommand)
 *   2. data fetch from the host callback with code rotation
 *   3. AI prompt building (keys only, no values) + AI response parsing
 *   4. options enrichment + constraint validation
 *   5. applying values to the form, and reverting them
 * The real editor, AI plugin and UI pages are NOT covered: see the manual
 * checklist in HANDOVER.md.
 */
const { test, describe } = require('node:test');
const strict = require('node:assert/strict');

const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const assert = Object.assign(Object.create(strict), {
    deepEqual: (actual, expected, msg) => strict.deepEqual(plain(actual), expected, msg),
});
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

const SCRIPTS = [
    'scripts/utils.js',
    'scripts/storage.js',
    'scripts/event.js',
    'scripts/library.js',
    'scripts/extractor.js',
    'scripts/mapper.js',
    'scripts/fields/constraints.js',
    'scripts/fields/registry.js',
    'scripts/fields/context.js',
    'scripts/fields/text.js',
    'scripts/fields/boolean.js',
    'scripts/fields/radio.js',
    'scripts/fields/complex.js',
    'scripts/fields/detect.js',
    'scripts/form.js',
];

function createLocalStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        key: (i) => Array.from(map.keys())[i] ?? null,
        get length() { return map.size; },
        _map: map,
    };
}

/**
 * Builds a sandbox with the plugin loaded.
 * @param {object} opts
 * @param {object} [opts.options]  plugin options passed by the host (code, callback)
 * @param {Function} [opts.fetch]  fetch stub
 * @param {object[]} [opts.forms]  fake ApiForm objects returned by Api.GetDocument().GetAllForms()
 */
function loadPlugin({ options = {}, fetch, forms = [] } = {}) {
    const executed = [];
    const formValues = {};

    const sandbox = {
        console,
        URLSearchParams,
        setTimeout,
        clearTimeout,
        Promise,
        localStorage: createLocalStorage(),
        location: { search: '', href: '' },
        document: { getElementById: () => null, readyState: 'complete', addEventListener() {} },
        fetch: fetch || (async () => { throw new Error('fetch not stubbed'); }),
        Api: { GetDocument: () => ({ GetAllForms: () => forms }) },
    };
    sandbox.window = sandbox;
    sandbox.Asc = {
        scope: {},
        plugin: {
            info: { options },
            tr: (s) => s,
            executeMethod(name, args, cb) {
                executed.push({ name, args });
                if (name === 'SetFormValue') formValues[args[0]] = args[1];
                if (name === 'GetFormValue') return cb(formValues[args[0]] ?? '');
                cb && cb(undefined);
            },
            callCommand(fn, _isClose, _isCalc, cb) {
                cb(fn());
            },
            executeCommand() {},
            attachEvent() {},
            onThemeChangedBase() {},
        },
    };

    vm.createContext(sandbox);
    for (const rel of SCRIPTS) {
        const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        vm.runInContext(code, sandbox, { filename: rel });
    }

    return { win: sandbox, A: sandbox.Autofiller, executed, formValues };
}

function fakeForm({ id, key, type = 'textForm', text = '', tag = '', tip = '', placeholder = '', format, limit, radio, choice, subForms, listValues }) {
    return {
        GetInternalId: () => id,
        GetFormKey: () => key,
        GetFormType: () => type,
        GetTag: () => tag,
        GetTip: () => tip,
        GetPlaceholder: () => placeholder,
        GetText: () => text,
        IsFixed: () => false,
        IsRadioButton: () => !!radio,
        GetRadioGroup: radio ? () => radio : undefined,
        GetChoiceName: radio ? () => choice : undefined,
        GetGroupValue: radio ? () => '' : undefined,
        GetFormat: format ? () => format : undefined,
        GetCharactersLimit: limit !== undefined ? () => limit : undefined,
        GetListValues: listValues ? () => listValues : undefined,
        GetSubForms: subForms ? () => subForms : undefined,
    };
}

function okResponse(body) {
    return { ok: true, status: 200, json: async () => body };
}

describe('1. Field detection (collectForms)', () => {
    const forms = [
        fakeForm({ id: 't1', key: 'FirstName' }),
        fakeForm({ id: 'sig', key: 'Signature', type: 'signatureForm' }),
        fakeForm({ id: 'pic', key: 'Photo', type: 'pictureForm' }),
        fakeForm({ id: 'cb', key: 'Agree', type: 'checkBoxForm' }),
        fakeForm({ id: 'r1', key: 'Gender', type: 'checkBoxForm', radio: 'Gender', choice: 'Male' }),
        fakeForm({ id: 'r2', key: 'Gender', type: 'checkBoxForm', radio: 'Gender', choice: 'Female' }),
        fakeForm({
            id: 'amount', key: 'Amount', type: 'complexForm',
            subForms: [
                fakeForm({ id: 'a1', type: 'textForm', format: { type: 'digit' }, limit: 3 }),
                fakeForm({ id: 'a2', type: 'textForm', format: { type: 'digit' }, limit: 3 }),
            ],
        }),
    ];

    test('detects text/checkbox/radio-group/complex fields and skips signature & picture', async () => {
        const { A } = loadPlugin({ forms });
        const fields = await A.FormDetectionService.detectAllForms();
        const byKey = Object.fromEntries(fields.map((f) => [f.identifier, f]));

        assert.ok(byKey.FirstName, 'text field detected');
        assert.ok(byKey.Agree?.isBoolean, 'checkbox detected as boolean');
        assert.ok(!byKey.Signature, 'signature field excluded');
        assert.ok(!byKey.Photo, 'picture field excluded');

        assert.equal(byKey.Gender.type, 'radioGroupForm');
        assert.deepEqual(byKey.Gender.choices.map((c) => c.choice), ['Male', 'Female']);

        assert.ok(byKey.Amount.isComplex, 'digit boxes grouped into one complex field');
        assert.equal(byKey.Amount.constraints.charactersLimit, 6);
    });

    test('generic auto-named fields (Text1, Field2...) are filtered before AI mapping', () => {
        const { A } = loadPlugin();
        const kept = A.Prompts.filterMeaningfulFields([
            { identifier: 'Text1' }, { identifier: 'field12' }, { identifier: 'CompanyName' }, { identifier: '  ' },
        ]);
        assert.deepEqual(kept.map((f) => f.identifier), ['CompanyName']);
    });
});

describe('2. Data fetch with code rotation (DataExtractor)', () => {
    test('uses options.code first, then the rotated code from the response', async () => {
        const calls = [];
        let n = 0;
        const fetch = async (url) => {
            calls.push(url);
            n += 1;
            return okResponse({ data: { name: 'John' }, code: `next${n}` });
        };
        const { A } = loadPlugin({ options: { code: 'initial', callback: 'https://host/api/data' }, fetch });

        assert.deepEqual(await A.DataExtractor.fetch(), { name: 'John' });
        await A.DataExtractor.fetch();
        assert.deepEqual(calls, ['https://host/api/data?code=initial', 'https://host/api/data?code=next1']);
    });

    test('a new options.code from the host overrides a stale stored refresh code', async () => {
        const calls = [];
        const fetch = async (url) => { calls.push(url); return okResponse({ data: {}, code: 'rotated' }); };
        const env = loadPlugin({ options: { code: 'first', callback: 'https://host/d' }, fetch });
        await env.A.DataExtractor.fetch(); // stores original_code=first, refresh_code=rotated

        const env2 = loadPlugin({ options: { code: 'second', callback: 'https://host/d' }, fetch });
        for (const [k, v] of env.win.localStorage._map) env2.win.localStorage.setItem(k, v);
        await env2.A.DataExtractor.fetch();

        assert.equal(calls.at(-1), 'https://host/d?code=second');
    });

    test('rejects invalid responses and HTTP errors', async () => {
        const opts = { code: 'c', callback: 'https://host/d' };
        let env = loadPlugin({ options: opts, fetch: async () => okResponse({ data: {} }) });
        await assert.rejects(env.A.DataExtractor.fetch(), /code/);

        env = loadPlugin({ options: opts, fetch: async () => ({ ok: false, status: 403 }) });
        await assert.rejects(env.A.DataExtractor.fetch(), (e) => e.status === 403);

        env = loadPlugin({ options: { code: 'c' } });
        await assert.rejects(env.A.DataExtractor.fetch(), /callback/);
    });
});

describe('3. AI mapping: prompt + response parsing', () => {
    const data = {
        person: { name: { first: 'John', last: 'Doe' }, email: 'secret@example.com' },
        products: [{ title: 'Widget', price: 10 }, { title: 'Gadget', price: 20 }],
    };

    test('extracts dot-notation keys from nested objects and arrays', () => {
        const { A } = loadPlugin();
        assert.deepEqual(A.DataMappingService.extractAllKeys(data), [
            'person.name.first', 'person.name.last', 'person.email', 'products.title', 'products.price',
        ]);
    });

    test('prompt contains field identifiers and data keys but never data values (privacy guarantee)', () => {
        const { A } = loadPlugin();
        const keys = A.DataMappingService.extractAllKeys(data);
        const prompt = A.Prompts.getFieldMappingPrompt(keys, [{ identifier: 'Email' }, { identifier: 'Product' }]);
        assert.match(prompt, /person\.email/);
        assert.match(prompt, /Email, Product/);
        for (const value of ['John', 'Doe', 'secret@example.com', 'Widget', '10']) {
            assert.ok(!prompt.includes(value), `prompt leaks value "${value}"`);
        }
    });

    test('parses AI output wrapped in code fences / with comments / as OpenAI-style object', () => {
        const { A } = loadPlugin();
        const P = (x) => A.DataMappingService.parseAIResponse(x).mapping;

        assert.deepEqual(P('```json\n{"mapping":{"Email":"person.email"}}\n```'), { Email: 'person.email' });
        assert.deepEqual(P('Sure! {"mapping":{"A":"x" // comment\n}}'), { A: 'x' });
        assert.deepEqual(P({ choices: [{ message: { content: '{"mapping":{"B":["y","z"]}}' } }] }), { B: ['y', 'z'] });
        assert.deepEqual(P('I cannot help with that'), {}, 'garbage -> empty mapping, no throw');
    });
});

describe('4. Options enrichment + constraints', () => {
    const data = {
        person: { email: 'john@example.com', phone: '+1 (234) 567-890', subscribed: true },
        products: [{ title: 'Widget' }, { title: 'Gadget' }],
        deal: { value: '1234567', stage: 'won' },
    };

    test('builds options per field type and drops unmapped fields', () => {
        const { A } = loadPlugin();
        const S = A.FormDetectionService;
        const fields = [
            { identifier: 'Email', type: 'textForm', constraints: {} },
            { identifier: 'Product', type: 'textForm', constraints: {} },
            { identifier: 'Phone', type: 'textForm', constraints: { format: { type: 'digit' }, charactersLimit: 6 } },
            { identifier: 'Subscribed', type: 'checkBoxForm', constraints: {} },
            { identifier: 'Stage', type: 'radioGroupForm', isRadioGroup: true, constraints: { listValues: ['Won', 'Lost'] } },
            { identifier: 'Unmapped', type: 'textForm', constraints: {} },
        ];
        const mapping = {
            Email: 'person.email', Product: 'products.title', Phone: 'person.phone',
            Subscribed: 'person.subscribed', Stage: 'deal.stage',
        };

        const out = Object.fromEntries(S.enrichFieldsWithOptions(fields, mapping, data).map((f) => [f.identifier, f.generatedOptions.map((o) => o.value)]));

        assert.deepEqual(out.Email, ['john@example.com']);
        assert.deepEqual(out.Product, ['Widget', 'Gadget'], 'array data -> one option per element');
        assert.deepEqual(out.Phone, ['123456'], 'digit format + 6-char limit applied');
        assert.deepEqual(out.Subscribed, ['true', 'false']);
        assert.deepEqual(out.Stage, ['Won', 'Lost'], 'radio value matched case-insensitively to list');
        assert.ok(!('Unmapped' in out), 'fields without valid options are dropped');
    });

    test('constraint validator: mask, regExp, list, split across boxes', () => {
        const { A } = loadPlugin();
        const V = A.ConstraintsValidator;
        assert.equal(V.resolveValueForField('12-34', { constraints: { format: { type: 'mask', value: '99-99' } } }), '12-34');
        assert.equal(V.resolveValueForField('1234', { constraints: { format: { type: 'mask', value: '99-99' } } }), null);
        assert.equal(V.resolveValueForField('abc', { constraints: { format: { type: 'regExp', value: '[0-9]+' } } }), null);
        assert.equal(V.resolveValueForField('LOST', { constraints: { listValues: ['Won', 'Lost'] } }), 'Lost');
        assert.equal(V.resolveValueForField('Other', { constraints: { listValues: ['Won', 'Lost'] } }), null);
        assert.deepEqual(V.splitValueAcrossBoxes('1234567', [3, 3, 3]), ['1', '234', '567']);
    });
});

describe('5. Apply and revert', () => {
    test('applies text, boolean, radio and complex values via SetFormValue', async () => {
        const { A, formValues } = loadPlugin();
        const T = A.FieldTypes;

        await T.apply({ fieldId: 't1', type: 'textForm', value: 'John' });
        await T.apply({ fieldId: 'cb', type: 'checkBoxForm', value: 'true' });
        await T.apply({ fieldId: 'r1', isRadioGroup: true, value: 'female', choices: [{ choice: 'Male', internalId: 'r1' }, { choice: 'Female', internalId: 'r2' }] });
        await T.apply({ fieldId: 'amt', isComplex: true, value: '1234567', subFields: [{ internalId: 'a1', charactersLimit: 3 }, { internalId: 'a2', charactersLimit: 3 }, { internalId: 'a3', charactersLimit: 3 }] });

        assert.equal(formValues.t1, 'John');
        assert.equal(formValues.cb, true);
        assert.equal(formValues.r2, true);
        assert.ok(!('r1' in formValues));
        assert.deepEqual([formValues.a1, formValues.a2, formValues.a3], ['1', '234', '567']);
    });

    test('restoreFields puts original values back document-side', async () => {
        const state = {};
        const mk = (id, extra = {}) => ({
            GetInternalId: () => id,
            SetValue: (v) => { state[id] = v; },
            Clear: () => { state[id] = '<cleared>'; },
            ...extra,
        });
        const forms = [mk('t1'), mk('t2'), mk('cb', { SetChecked: (v) => { state.cb = v; } })];
        const { A } = loadPlugin({ forms });

        await A.FormService.restoreFields([
            { fieldId: 't1', value: 'old' },
            { fieldId: 't2', value: '' },
            { fieldId: 'cb', value: 'false' },
        ]);
        assert.deepEqual(state, { t1: 'old', t2: '<cleared>', cb: false });
    });
});

describe('Packaging sanity', () => {
    test('config.json version matches the top CHANGELOG entry (CI tags from CHANGELOG)', () => {
        const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
        const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
        const top = changelog.match(/[0-9]+(\.[0-9]+)+/)[0];
        assert.equal(cfg.version, top);
    });

    test('every translation file has the same keys as ru-RU.json', () => {
        const dir = path.join(ROOT, 'translations');
        const langs = JSON.parse(fs.readFileSync(path.join(dir, 'langs.json'), 'utf8'));
        const ref = Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'ru-RU.json'), 'utf8'))).sort();
        for (const lang of langs) {
            const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(dir, `${lang}.json`), 'utf8'))).sort();
            assert.deepEqual(keys, ref, `${lang}.json keys differ from ru-RU.json`);
        }
    });
});
