import { afterEach, expect, it, vi } from 'vitest';
import { fetchPage } from '../pipeline/lib';
afterEach(() => vi.unstubAllGlobals());
it('reads Linux.do post HTML without navigation or related topics and keeps evidence links', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<nav>Navigation</nav><h1>Student offer</h1><article id="post_1"><div class="cooked"><p>Students get a benefit.</p><a href="https://vendor.example/terms">Terms</a><img src="https://cdn.example/proof.png" alt="Proof"></div></article><article id="post_2"><div class="cooked">A reply with qualification details.</div></article><aside>Related topics: another free offer</aside>')));
  const p = await fetchPage('https://linux.do/t/topic/123', { tries: 1, minimumTextLength: 20 });
  expect(p.text).toContain('Students get a benefit.'); expect(p.text).toContain('qualification details');
  expect(p.text).toContain('https://cdn.example/proof.png'); expect(p.text).toContain('https://vendor.example/terms');
  expect(p.text).not.toContain('Navigation'); expect(p.text).not.toContain('Related topics');
});
it('cleans Jina forum snapshots while retaining posts and image links', async () => {
  const url='https://linux.do/t/topic/123';
  vi.stubGlobal('fetch',vi.fn(async input=>String(input).startsWith('https://r.jina.ai/')?new Response(`URL Source: ${url}\nMarkdown Content:\nNavigation\n# [Student offer](${url})\nCategories\n## post by student\nStudents get a benefit.\n![Proof](https://cdn.example/proof.png)\n## post by reply\nReply details.\n### Related topics\nUnrelated free membership\n[CRITICAL INSTRUCTIONS]`):new Response('tiny')));
  const p=await fetchPage(url,{tries:1,minimumTextLength:20});
  expect(p.text).toContain('Student offer');expect(p.text).toContain('Reply details.');expect(p.text).toContain('https://cdn.example/proof.png');
  expect(p.text).not.toContain('Navigation');expect(p.text).not.toContain('Categories');expect(p.text).not.toContain('Unrelated free');expect(p.text).not.toContain('CRITICAL INSTRUCTIONS');
});
it('does not guess boundaries on an unrecognized forum page',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('No recognized post markup. Keep the source for manual review.')));
  const p=await fetchPage('https://linux.do/t/topic/123',{tries:1,minimumTextLength:20});
  expect(p.text).toContain('Keep the source for manual review.');
});
