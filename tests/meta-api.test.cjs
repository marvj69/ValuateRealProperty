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
    vm.runInContext(source('meta-api.js') + '\nglobalThis.client = MetaAI;', context);
    return {context, calls, delays, events, saved, client:context.client};
}
function loadWorker(h) {
    // The real worker imports the shared file. Recreate its separate global scope.
    const providerSource = source('service-worker.js').replace("importScripts('./meta-api.js');", '');
    vm.runInContext(providerSource, h.context);
    h.context.saved = h.saved;
    vm.runInContext(`saveJob = async job => saved.push(structuredClone(job));
        persistFinalReport = async () => ({id:'saved-test'});
        notifyClients = async () => {};
        showCompletionNotification = async () => {};`, h.context);
    h.context.structuredClone = structuredClone;
}
function fn(name) {
    const match = source('app.js').match(new RegExp('^(?:async )?function '+name+'\\([^\\n]*\\).*?^}', 'ms'));
    assert.ok(match, name);
    return match[0];
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

test('frontend routing ignores old model choices and refuses old-provider keys', async () => {
    const h = harness();
    vm.runInContext(`const DEFAULT_API_SERVICE=MetaAI.service; const API_KEY_STORAGE='valuate:metaApiKey';
        const requestState={costMode:false,promptKey:'standard'};\n` +
        ['normalizeApiService','getApiKeyStorageKey','getSelectedReportModels','getReportModelForIndex','resolveFinalMergeApiService','resolveFinalMergeModel','callModelAPI'].map(fn).join('\n'), h.context);
    assert.equal(h.context.normalizeApiService('gemini'),'meta');
    assert.equal(h.context.getApiKeyStorageKey('openai'),'valuate:metaApiKey');
    assert.equal(h.context.getSelectedReportModels('openrouter')[0],MODEL);
    for (const oldModel of ['gemini-3-flash-preview','gpt-5.4','vendor/old']) {
        await h.context.callModelAPI('meta','key',oldModel,'Test',false,0);
    }
    assert.ok(h.calls.every(call=>call.payload.model===MODEL));
    await assert.rejects(h.context.callModelAPI('gemini','old-key','old-model','Test',false,0));
    assert.equal(h.calls.length,3);
});

test('full background workflow uses Meta for drafts, validation, merge, value, and address', async () => {
    const h = harness();
    loadWorker(h);
    const job={id:'test-job',payload:{apiService:'meta',apiKey:'meta-key',reportModels:['legacy/model'],finalModel:'old-merge',finalMergeApiKey:'old-key',prompt:'Test report',enableSearch:true,reportCount:2,promptKey:'standard',reportAudience:'seller',attachments:[]},reports:[]};
    await h.context.processJob(job);
    assert.equal(job.status,'completed',job.error);
    assert.equal(h.calls.length,6);
    assert.ok(h.calls.every(call=>call.payload.model===MODEL && call.headers.Authorization==='Bearer meta-key'));
    assert.deepEqual(h.calls.map(call=>Boolean(call.payload.tools)),[true,true,true,false,false,false]);
    assert.equal(job.payload.finalModel,MODEL);
    assert.ok(job.reports.every(report=>report.model===MODEL));
});

test('old queued provider jobs stop without sending their keys anywhere', async () => {
    const h=harness(); loadWorker(h);
    for (const provider of ['gemini','openrouter','openai',undefined]) {
        const job={id:'old-job',payload:{apiService:provider,apiKey:'old-key',model:'old-model'}};
        await h.context.processJob(job);
        assert.equal(job.status,'error');
        assert.match(job.error,/previous provider/);
    }
    assert.equal(h.calls.length,0);
});

test('background budget mode completes with exactly one Meta call', async () => {
    const h=harness(); loadWorker(h);
    const job={id:'budget',payload:{apiService:'meta',apiKey:'key',model:MODEL,prompt:'Test',reportCount:3,costMode:true},reports:[]};
    await h.context.processJob(job);
    assert.equal(job.status,'completed',job.error);
    assert.equal(h.calls.length,1);
});

test('page and service worker load and cache the same provider client', () => {
    const page=source('index.html'), worker=source('service-worker.js');
    assert.ok(page.indexOf('src="meta-api.js"') < page.indexOf('src="app.js"'));
    assert.match(worker,/importScripts\('\.\/meta-api.js'\)/);
    assert.match(worker,/const PRECACHE_URLS = \[[\s\S]*?'\.\/meta-api.js'/);
    for (const file of ['app.js','service-worker.js','meta-api.js']) {
        assert.doesNotMatch(source(file),/https:\/\/(api\.openai\.com|openrouter\.ai|generativelanguage\.googleapis\.com)/);
    }
});

test('background authentication failures are not resubmitted by the report retry loop', async () => {
    const h=harness(() => new Response(JSON.stringify({error:{message:'Invalid key'}}),{status:401}));
    loadWorker(h);
    const job={id:'invalid',payload:{apiService:'meta',apiKey:'bad-key',model:MODEL,prompt:'Test',reportCount:1},reports:[]};
    await h.context.processJob(job);
    assert.equal(job.status,'error');
    assert.equal(h.calls.length,1);
    assert.match(job.reports[0].error,/rejected the API key/);
});

test('a sync permission denial after dispatch does not duplicate the paid report', async () => {
    const h=harness(); const messages=[];
    h.context.navigator={serviceWorker:{ready:Promise.resolve({
        active:{postMessage:message=>messages.push(message)},
        sync:{register:async()=>{throw new Error('Permission denied');}}
    })}};
    h.context.console={warn() {}};
    vm.runInContext(fn('sendJobToServiceWorker'),h.context);
    assert.equal(await h.context.sendJobToServiceWorker({id:'job'}),true);
    assert.equal(messages.length,1);
    assert.equal(messages[0].type,'QUEUE_JOB');
});

test('browser file readers preserve names and encode binary PDFs and images', async () => {
    const h=harness();
    h.context.btoa=text=>Buffer.from(text,'binary').toString('base64');
    h.context.FileReader=class {
        readAsArrayBuffer(file) {this.result=file.bytes;this.onload();}
    };
    vm.runInContext(['readFileAsBase64','readFilesAsBase64','arrayBufferToBase64'].map(fn).join('\n'),h.context);
    const bytes=new Uint8Array([0,127,128,255]).buffer;
    const result=await h.context.readFilesAsBase64([{name:'binary.pdf',type:'application/pdf',bytes}]);
    assert.equal(result[0].data,'AH+A/w==');
    assert.equal(result[0].name,'binary.pdf');
    assert.equal(result[0].mimeType,'application/pdf');
});
