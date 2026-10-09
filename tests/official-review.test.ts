import { describe,it,expect,vi,afterEach } from 'vitest';
import { officialTier } from '../src/shared/official-review';
import { parseSearchResults,searchOfficial } from '../pipeline/official-review';
const platform={id:'vendor',name:'Vendor',site:'https://vendor.example',xHandles:['@vendor'],staffHandles:['@staff']};
afterEach(()=>vi.unstubAllGlobals());
describe('official source discovery',()=>{
  it('accepts registered docs and account posts but rejects lookalikes and unrelated shared-host content',()=>{
    expect(officialTier('https://docs.vendor.example/credits',platform,[])).toBe('docs');
    expect(officialTier('https://vendor.example.evil.test/free',platform,[])).toBeNull();
    expect(officialTier('https://x.com/vendor/status/123',platform,[])).toBe('official');
    expect(officialTier('https://x.com/vendor_fans/status/123',platform,[])).toBeNull();
    expect(officialTier('https://x.com/staff/status/123',platform,[])).toBe('staff');
    const sources=[{url:'https://github.com/vendor/project',tier:'official'}];
    expect(officialTier('https://github.com/vendor/project/blob/main/README.md',platform,sources)).toBe('site');
    expect(officialTier('https://github.com/attacker/project',platform,sources)).toBeNull();
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
