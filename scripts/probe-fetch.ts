// 诊断：用生产采集同样的读取逻辑抓取指定网址，打印读取方式与正文开头。不写任何数据，不输出密钥。
// 用法（GitHub Actions）：collect.yml 的 probe_urls 输入；本机：PROBE_URLS=url1,url2 npx tsx scripts/probe-fetch.ts
import { fetchPage } from '../pipeline/lib';
const urls = (process.env.PROBE_URLS ?? '').split(',').map(u => u.trim()).filter(Boolean);
console.log(`EXA_API_KEY ${process.env.EXA_API_KEY ? 'present' : 'missing'} · JINA_API_KEY ${process.env.JINA_API_KEY ? 'present' : 'missing'}`);
for (const url of urls) {
  try {
    const page = await fetchPage(url, { timeoutMs: 30000, tries: 1, minimumTextLength: 50 });
    console.log(`\n${url}\n  method=${page.fetchMethod} via=${page.via} sourceVerified=${page.sourceVerified} length=${page.text.length}\n  ${page.text.replace(/\s+/g, ' ').slice(0, 400)}`);
  } catch (error) { console.log(`\n${url}\n  ERROR ${(error as Error).message.slice(0, 300)}`); }
}
