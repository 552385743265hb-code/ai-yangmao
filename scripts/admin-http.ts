import { spawnSync } from 'node:child_process';

/** Curl 使用本机网络栈；凭据经 stdin 传入，不出现在参数列表或错误输出中。写请求只重试尚未发送 HTTP 的连接失败。 */
export function adminHttp(url: string, token: string, body?: unknown): { status: number; data: any } {
  const quote = (text: string) => JSON.stringify(text);
  const config = [
    `url = ${quote(url)}`, `header = ${quote(`Authorization: Bearer ${token}`)}`,
    'header = "Content-Type: application/json"',
    ...(body === undefined ? [] : [`request = "POST"`, `data-binary = ${quote(JSON.stringify(body))}`]),
  ].join('\n');
  let result;
  for (let attempt=0;attempt<3;attempt++) {
    result = spawnSync('curl', ['--silent','--show-error','--connect-timeout','8','--max-time','12','--config','-','--write-out','\n%{http_code}'],
      { input: config, encoding: 'utf8', timeout: 15_000, maxBuffer: 8*1024*1024 });
    // DNS/连接/TLS 握手失败发生在 HTTP 请求发送前，可安全重试；超时/空响应不能重试写入。
    if (![6,7,35].includes(result.status ?? -1)) break;
  }
  if (!result) throw new Error('管理接口未发起请求');
  if (result.error || result.status !== 0) throw new Error('管理接口网络请求失败；写请求未自动重试，请检查待审或送达台账');
  const split = result.stdout.lastIndexOf('\n');
  const status = Number(result.stdout.slice(split+1));
  let data;
  try { data = JSON.parse(result.stdout.slice(0,split)); } catch { throw new Error(`管理接口返回非 JSON（HTTP ${status}）`); }
  return { status, data };
}
