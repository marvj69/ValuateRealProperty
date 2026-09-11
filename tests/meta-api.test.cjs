const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const MODEL = 'muse-spark-1.3-contributor';
const success = (text = 'Report text', extra = {}) => ({status:'completed', output:[{type:'message', role:'assistant', content:[{type:'output_text', text}]}], ...extra});
function harness(handler = () => success()) {
    const calls = [], delays = [], events = {}, saved = [];
    const context = vm.createContext({
        console, URL, Response, Date,
        setTimeout(fn, delay) { delays.push(delay); fn(); },
        async fetch(url, options) {
            calls.push({url, ...options, payload:JSON.parse(options.body)});
            const result = await handler(calls.at(-1), calls.length);
            return result instanceof Response ? result : new Response(JSON.stringify(result), {status:200});
        },
        self: {addEventListener(name, fn) {events[name] = fn;}, location:{origin:'http://localhost'}, clients:{matchAll:async()=>[]}},
        importScripts(file) { vm.runInContext(source(file.replace('./', '')), context); }
    });
    vm.runInContext(source('server/lib/meta-client.js').replace('export const MetaAI', 'const MetaAI') + '\nglobalThis.client = MetaAI;', context);
    return {context, calls, delays, events, saved, client:context.client};
}
test('text, PDF, image, search, and model use the Meta Responses protocol', async () => {
    const h = harness();
    await h.client.generate('test-meta-key', 'Research', true, [
        {mimeType:'application/pdf', name:'test.pdf', data:'cGRm'},
        {mimeType:'image/png', data:'aW1hZ2U='}
    ], {promptKey:'experimental'});
    const request = h.calls[0];
    assert.equal(request.url, 'https://api.meta.ai/v1/responses');
    assert.equal(request.headers.Authorization, 'Bearer test-meta-key');
    assert.equal(request.payload.model, MODEL);
    assert.equal(request.payload.store, false);
    assert.equal(request.payload.reasoning.effort, 'high');
    assert.deepEqual(request.payload.tools, [{type:'web_search'}]);
    assert.equal(request.payload.input[0].content[1].file_data, 'data:application/pdf;base64,cGRm');
    assert.equal(request.payload.input[0].content[2].image_url, 'data:image/png;base64,aW1hZ2U=');
    assert.equal(request.redirect, 'error');
    assert.equal(request.cache, 'no-store');
});

test('budget and extraction calls omit search and sampling parameters', async () => {
    const h = harness();
    await h.client.generate('key', 'Extract', false, [], {costMode:true});
    const body = h.calls[0].payload;
    assert.equal(body.max_output_tokens, 8192);
    assert.equal(body.reasoning.effort, 'low');
    for (const key of ['tools','temperature','top_p','plugins']) assert.equal(key in body, false);
});

test('empty keys and unsupported attachments fail before any network request', async () => {
    const h = harness();
    await assert.rejects(h.client.generate('', 'Test', false), /Meta AI API key/);
    await assert.rejects(h.client.generate('key','Test',false,[{mimeType:'image/heic'}]), /attachments/);
    assert.equal(h.calls.length,0);
});

test('only final text is rendered, with clickable source citations', async () => {
    const h = harness(() => ({status:'completed',output:[
        {type:'reasoning',text:'Hidden analysis'},
        {type:'message',role:'assistant',content:[{type:'output_text',text:'Verified fact.',annotations:[
            {type:'url_citation',title:'Source',url:'https://example.com/source',end_index:14},
            {type:'url_citation',title:'Bad',url:'javascript:alert(1)',end_index:14}
        ]}]}
    ]}));
    const result = await h.client.generate('key','Test',true);
    assert.match(result.content, /\[Source\]\(<https:\/\/example.com\/source>\)/);
    assert.doesNotMatch(result.content, /Hidden analysis|javascript:/);
});

test('rate limits honor Retry-After without changing model or search', async () => {
    const h = harness((request, count) => count === 1
        ? new Response(JSON.stringify({error:{message:'Rate limit'}}), {status:429,headers:{'Retry-After':'2'}})
        : success());
    await h.client.generate('key','Test',true);
    assert.deepEqual(h.delays,[2000]);
    assert.equal(h.calls.length,2);
    assert.deepEqual(h.calls[0].payload,h.calls[1].payload);
});

test('invalid keys, quota failures, and search errors do not silently retry or disable search', async () => {
    for (const [status, message] of [[401,'Invalid'],[429,'insufficient_quota'],[400,'web_search unavailable']]) {
        const h = harness(() => new Response(JSON.stringify({error:{message}}), {status}));
        await assert.rejects(h.client.generate('key','Test',true));
        assert.equal(h.calls.length,1);
        assert.deepEqual(h.calls[0].payload.tools,[{type:'web_search'}]);
    }
});

test('truncation, refusal, and empty completions cannot become successful reports', async () => {
    for (const result of [success('Partial',{status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),
        {status:'completed',output:[]},
        {status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'Declined'}]}]}]) {
        const h = harness(() => result);
        await assert.rejects(h.client.generate('key','Test',false));
    }
});

test('upstream errors cannot echo an API key into the report or logs', async () => {
    const h = harness(() => new Response(JSON.stringify({error:{message:'Rejected sensitive-test-key'}}),{status:403}));
    await assert.rejects(h.client.generate('sensitive-test-key','Test',false), error => !error.message.includes('sensitive-test-key'));
});
