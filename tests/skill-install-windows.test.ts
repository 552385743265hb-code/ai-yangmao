import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it, expect } from 'vitest';

const exec = promisify(execFile);
const script = resolve('integrations/agent/install.ps1');

describe.skipIf(process.platform !== 'win32')('Windows 原生 Skill 安装', () => {
  it('在中文和空格路径安装、校验、备份，并保留失败前的内容和其他安装锁', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ym-win-skill-'));
    const target = join(dir, '用户 profile [test]', 'skill');
    const files = new Map<string, Buffer>();
    for (const name of ['SKILL.md', 'LICENSE', 'agents/openai.yaml']) files.set('/' + name, await readFile('integrations/agent/ai-yangmao-public/' + name));
    const manifest = Buffer.from([...files].map(([name, bytes]) => createHash('sha256').update(bytes).digest('hex') + '  ' + name.slice(1)).join('\n') + '\n');
    files.set('/manifest.sha256', manifest);
    let gate: Promise<void> | undefined;
    let arrived: (() => void) | undefined;
    const server = createServer(async (req, res) => {
      arrived?.();
      if (gate) await gate;
      const body = files.get(req.url!);
      res.writeHead(body ? 200 : 404);
      res.end(body);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
    const install = (destination = target, engine = 'powershell.exe') => exec(engine, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Dir', destination, '-BaseUrl', base]);
    try {
      await install();
      const original = await readFile(join(target, 'SKILL.md'));
      expect(original).toEqual(files.get('/SKILL.md'));
      expect(await readFile(join(target, 'agents/openai.yaml'))).toEqual(files.get('/agents/openai.yaml'));
      await install();
      expect((await readdir(join(dir, '用户 profile [test]'))).some(name => name.startsWith('skill.backup.'))).toBe(true);

      files.set('/manifest.sha256', Buffer.from((manifest.toString().split('\n')[0] + '\n').repeat(3)));
      await expect(install()).rejects.toThrow();
      files.set('/manifest.sha256', Buffer.from(manifest.toString().replace('LICENSE', '../LICENSE')));
      await expect(install()).rejects.toThrow();
      files.set('/manifest.sha256', Buffer.from(manifest.toString().split('\n').slice(0, 2).join('\n') + '\n'));
      await expect(install()).rejects.toThrow();
      files.set('/manifest.sha256', manifest);
      const validSkill = files.get('/SKILL.md')!;
      files.set('/SKILL.md', Buffer.from('tampered'));
      await expect(install()).rejects.toThrow();
      expect(await readFile(join(target, 'SKILL.md'))).toEqual(original);
      files.set('/SKILL.md', validSkill);
      for (const invalid of ['name: ai-yangmao-public\n', '---\nname: another-skill\n---\nname: ai-yangmao-public\n', '---\nname: AI-YANGMAO-PUBLIC\n---\n']) {
        files.set('/SKILL.md', Buffer.from(invalid));
        files.set('/manifest.sha256', Buffer.from(manifest.toString().replace(/^[0-9a-f]{64}/, createHash('sha256').update(invalid).digest('hex'))));
        await expect(install()).rejects.toThrow();
        expect(await readFile(join(target, 'SKILL.md'))).toEqual(original);
      }
      files.set('/SKILL.md', validSkill);
      files.set('/manifest.sha256', manifest);
      const license = files.get('/LICENSE')!;
      files.delete('/LICENSE');
      await expect(install()).rejects.toThrow();
      expect(await readFile(join(target, 'SKILL.md'))).toEqual(original);
      files.set('/LICENSE', license);

      const foreign = join(dir, 'foreign');
      await mkdir(foreign);
      await writeFile(join(foreign, 'SKILL.md'), '---\nname: another-skill\n---\n');
      await expect(install(foreign)).rejects.toThrow();
      expect(await readFile(join(foreign, 'SKILL.md'), 'utf8')).toContain('another-skill');
      await writeFile(join(foreign, 'SKILL.md'), '---\nname: another-skill\n---\nExample:\nname: ai-yangmao-public\n');
      await expect(install(foreign)).rejects.toThrow();
      expect(await readFile(join(foreign, 'SKILL.md'), 'utf8')).toContain('another-skill');
      const junction = join(dir, 'linked-skill');
      await symlink(foreign, junction, 'junction');
      await expect(install(junction)).rejects.toThrow();
      expect(await readFile(join(foreign, 'SKILL.md'), 'utf8')).toContain('another-skill');

      let release!: () => void;
      gate = new Promise<void>(resolve => { release = resolve; });
      const started = new Promise<void>(resolve => { arrived = resolve; });
      const installing = install();
      // 同时监听安装失败，避免脚本在请求前出错时测试一直等待。
      await Promise.race([started, installing.then(() => { throw new Error('安装未经过下载服务'); })]);
      try { await expect(install()).rejects.toMatchObject({ code: 75 }); }
      finally { gate = undefined; release(); arrived = undefined; }
      await installing;
      await mkdir(target + '.install-lock');
      await writeFile(join(target + '.install-lock', 'pid'), '99999999');
      await expect(install()).rejects.toMatchObject({ code: 75 });
      expect(await readFile(join(target + '.install-lock', 'pid'), 'utf8')).toBe('99999999');
      expect(await readFile(join(target, 'SKILL.md'))).toEqual(original);
      await rm(target + '.install-lock', { recursive: true });

      if (spawnSync('pwsh.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']).status === 0) {
        await install(join(dir, 'powershell7-skill'), 'pwsh.exe');
        expect(await readFile(join(dir, 'powershell7-skill', 'SKILL.md'))).toEqual(original);
      }
      expect((await readdir(join(dir, '用户 profile [test]'))).filter(name => name.startsWith('.ai-yangmao-public.'))).toEqual([]);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
