import { describe,it,expect,vi,afterEach } from 'vitest';
import { officialTier,officialActivityMismatch } from '../src/shared/official-review';
import { parseSearchResults,searchOfficial } from '../pipeline/official-review';
const platform={id:'vendor',name:'Vendor',site:'https://vendor.example',xHandles:['@vendor'],staffHandles:['@staff']};
afterEach(()=>vi.unstubAllGlobals());
describe('official source discovery',()=>{
  it('rejects unrelated recurring quotas or pricing as proof of a one-off gift or reset',()=>{
    const monthly={title:'Max API credits',valueText:'每月 100 至 200 美元 API 额度',type:'standing',tags:[]};
    expect(officialActivityMismatch({title:'Claude $250 额度赠金',valueText:'$250赠金',type:'perk'},monthly)).toContain('另一类活动');
    expect(officialActivityMismatch({title:'Opus发布送重置卡',valueText:'1张',type:'perk',tags:['reset']},monthly)).toContain('另一类活动');
    expect(officialActivityMismatch({...monthly,type:'perk',valueText:'每月100美元 API额度'},monthly)).toBeNull();
  });
  it('accepts registered docs and account posts but rejects lookalikes and unrelated shared-host content',()=>{
    expect(officialTier('https://docs.vendor.example/credits',platform,[])).toBe('docs');
    expect(officialTier('https://vendor.example.evil.test/free',platform,[])).toBeNull();
    expect(officialTier('https://x.com/vendor/status/123',platform,[])).toBe('official');
    expect(officialTier('https://x.com/vendor_fans/status/123',platform,[])).toBeNull();
    expect(officialTier('https://x.com/staff/status/123',platform,[])).toBe('staff');
    const sources=[{url:'https://github.com/vendor/project',tier:'official'}];
    expect(officialTier('https://github.com/vendor/project/blob/main/README.md',platform,sources)).toBe('site');
    expect(officialTier('https://github.com/attacker/project',platform,sources)).toBeNull();
    expect(officialTier('https://github.com/vendor/project/issues/123',platform,sources)).toBeNull();
    expect(officialTier('https://github.com/vendor/project/discussions/123',platform,sources)).toBeNull();
    expect(officialTier('https://github.com/vendor/project/releases/tag/v1#issuecomment-123',platform,sources)).toBeNull();
    expect(officialTier('https://vendor.example:8080/free',platform,[])).toBeNull();
  });
  it('parses actual MCP source records, never promoting excerpts into fetched evidence',()=>{
    const body=JSON.stringify({result:{content:[{type:'text',text:'Title: Benefit\nURL: https://vendor.example/free\nHighlights:\nFree credits'}]}});
    expect(parseSearchResults('event: message\ndata: '+body+'\n\n')).toEqual(['https://vendor.example/free']);
    expect(()=>parseSearchResults(JSON.stringify({result:{isError:true,content:[{type:'text',text:'rate limit'}]}}))).toThrow();
  });
  it('uses the cloud-callable search endpoint with no local browser or credentials',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({result:{content:[{type:'text',text:'URL: https://vendor.example/free'}]}})));
    vi.stubGlobal('fetch',fetcher);
    expect(await searchOfficial('Vendor free credits official',Date.now()+30000)).toEqual(['https://vendor.example/free']);
    const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe('https://mcp.exa.ai/mcp');
    const request=JSON.parse(String(init.body));expect(request.params.name).toBe('web_search_exa');expect(request.params.arguments.objective).toContain('official');
  });
});

it('keeps room for a fresh automatic benefit amid an unreachable manual backlog',async()=>{
  const {selectLeads}=await import('../src/shared/leads');
  const stuck=Array.from({length:50},(_,id)=>({id,origin:'manual',title:'旧补录链接'}));
  const urgent={id:99,origin:'aihot',title:'Codex 今日重置卡发放'};
  const chosen=selectLeads([...stuck,urgent],50);
  expect(chosen).toHaveLength(50);expect(chosen).toContain(urgent);expect(chosen).toContain(stuck[0]);
});

it('only marks reader content attributable when its source metadata matches and has no error warning',async()=>{
  const {fetchPage}=await import('../pipeline/lib');
  vi.stubGlobal('fetch',vi.fn(async(input)=>String(input).startsWith('https://r.jina.ai/')
    ?new Response('Title: Official\nURL Source: https://vendor.example/free\nMarkdown Content:\nAll users receive free credits.')
    :new Response('tiny')));
  expect((await fetchPage('https://vendor.example/free',{tries:1})).sourceVerified).toBe(true);
  vi.stubGlobal('fetch',vi.fn(async(input)=>String(input).startsWith('https://r.jina.ai/')
    ?new Response('URL Source: https://vendor.example/free\nWarning: Target URL returned error 403\nMarkdown Content:\nblocked')
    :new Response('tiny')));
  expect((await fetchPage('https://vendor.example/free',{tries:1})).sourceVerified).toBe(false);
});
