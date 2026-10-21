import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures/frontend';

const exec = promisify(execFile);
const engines = ['powershell.exe', ...(process.platform === 'win32' && spawnSync('pwsh.exe', ['-NoProfile', '-Command', 'exit 0']).status === 0 ? ['pwsh.exe'] : [])];

describe.skipIf(process.platform !== 'win32')('页面提供的 Windows 安装命令', () => {
  it.each(engines)('%s：下载失败不执行旧脚本，中文方括号临时目录可运行且传播安装失败', async engine => {
    const dir = await mkdtemp(join(tmpdir(), 'ym-bootstrap-'));
    const temp = join(dir, '临时 [test]');
    await mkdir(temp);
    const marker = join(dir, 'ran.txt');
    const psPath = marker.replaceAll("'", "''");
    const staleScript = `[IO.File]::WriteAllText('${psPath}', 'stale')`;
    await writeFile(join(temp, 'ai-yangmao-install.ps1'), staleScript);
    let status = 503;
    let script = `[IO.File]::WriteAllText('${psPath}', 'fresh')`;
    const server = createServer((_req, res) => {
      res.writeHead(status, { 'Content-Type': 'application/octet-stream' });
      res.end(script);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const f = fixture(() => ({}), '#agent');
    Object.assign(f.context.navigator, { platform: 'Win32' });
    f.run('pAgent()');
    const command = f.document.querySelector('#agentInstall')!.textContent!.replace('https://ai-yangmao.com/ai-yangmao-public', base);
    const run = () => exec(engine, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { env: { ...process.env, TEMP: temp, TMP: temp } });
    try {
      await expect(run()).rejects.toThrow();
      await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
      status = 200;
      await run();
      expect(await readFile(marker, 'utf8')).toBe('fresh');
      script = 'exit 19';
      await expect(run()).rejects.toThrow();
      expect(await readdir(temp)).toEqual(['ai-yangmao-install.ps1']);
      expect(await readFile(join(temp, 'ai-yangmao-install.ps1'), 'utf8')).toBe(staleScript);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
