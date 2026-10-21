import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fixture } from './fixtures/frontend';

function page(platform = 'Win32', handle: (url: string) => unknown = () => ({})) {
  const f = fixture(handle, '#agent');
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.assign(f.context.navigator, { platform, clipboard: { writeText: copy } });
  f.run('pAgent()');
  const choose = (selector: string, value: string) => {
    const select = f.document.querySelector(selector)!;
    select.querySelectorAll('option').forEach(option => option.toggleAttribute('selected', option.getAttribute('value') === value));
    select.dispatchEvent(new f.window.Event('change'));
  };
  return { ...f, copy, choose };
}

describe('Agent 接入的系统和客户端选择', () => {
  it('中英文 README 的 Windows 命令与页面保持一致', () => {
    const command = page().document.querySelector('#agentInstall')!.textContent!;
    for (const path of ['README.md', 'README.en.md']) {
      const readme = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
      expect(readme).toContain('```powershell\n' + command + '\n```');
    }
  });

  it('Windows 默认提供 PowerShell，并复制切换后 Claude Code 的真实安装命令', async () => {
    const f = page();
    expect(f.document.querySelector('[data-agent-os="windows"]')?.getAttribute('aria-pressed')).toBe('true');
    const initial = f.document.querySelector('#agentInstall')!.textContent!;
    expect(initial).toContain('Invoke-WebRequest -UseBasicParsing');
    expect(initial).toContain('/install.ps1');
    expect(initial).not.toContain('bash ');
    expect(initial).not.toContain('/tmp/');
    f.choose('[data-agent-skill-client]', 'claude');
    const current = f.document.querySelector('#agentInstall')!.textContent!;
    expect(current).toContain("-Dir (Join-Path $env:USERPROFILE '.claude\\skills\\ai-yangmao-public')");
    f.document.querySelector('[data-agent-copy="agentInstall"]')!.dispatchEvent(new f.window.Event('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.copy).toHaveBeenCalledExactlyOnceWith(current);
    expect(f.document.querySelector('[data-agent-copy="agentInstall"]')!.textContent).toBe('已复制');
    f.document.querySelector('[data-agent-os="unix"]')!.dispatchEvent(new f.window.Event('click'));
    expect(f.document.querySelector('#agentInstall')!.textContent).toContain('bash /tmp/ai-yangmao-install.sh --dir "$HOME/.claude/skills/ai-yangmao-public"');
    expect(f.document.querySelector('#agentInstall')!.textContent).not.toContain('powershell.exe');
  });

  it('按客户端提供对应的 MCP 格式，并保留与系统一致的配置路径', async () => {
    const f = page();
    expect(f.document.querySelector('#agentCodex')!.textContent).toContain('codex mcp add ai-yangmao --url https://ai-yangmao.com/api/mcp');
    expect(f.document.querySelector('#agentCodexConfig')!.textContent).toContain('[mcp_servers.ai-yangmao]');
    expect(f.document.querySelector('[data-agent-mcp-code]')!.textContent).toContain('%USERPROFILE%\\.codex\\config.toml');
    f.choose('[data-agent-mcp-client]', 'cursor');
    expect(JSON.parse(f.document.querySelector('#agentConfig')!.textContent!)).toEqual({ mcpServers: { 'ai-yangmao': { url: 'https://ai-yangmao.com/api/mcp' } } });
    f.document.querySelector('[data-agent-copy="agentConfig"]')!.dispatchEvent(new f.window.Event('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.copy).toHaveBeenCalledWith(f.document.querySelector('#agentConfig')!.textContent);
    f.choose('[data-agent-mcp-client]', 'claude');
    expect(f.document.querySelector('#agentClaude')!.textContent).toContain('claude mcp add --transport http --scope user ai-yangmao');
    expect(f.document.querySelector('#agentConfig')).toBeNull();
    f.choose('[data-agent-mcp-client]', 'other');
    expect(f.document.querySelector('[data-agent-mcp-code]')!.textContent).toContain('Streamable HTTP');
    expect(f.document.querySelector('[data-agent-mcp-code] pre')).toBeNull();
  });

  it('非 Windows 保留 Bash 入口，复制失败时仍可手动选取命令', async () => {
    const f = page('MacIntel');
    expect(f.document.querySelector('[data-agent-os="unix"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(f.document.querySelector('#agentInstall')!.textContent).toContain('curl --fail');
    f.copy.mockRejectedValueOnce(new Error('clipboard unavailable'));
    f.document.querySelector('[data-agent-copy="agentMcp"]')!.dispatchEvent(new f.window.Event('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.document.querySelector('#agentMcp')!.textContent).toBe('https://ai-yangmao.com/api/mcp');
    expect(f.document.querySelector('[data-agent-copy="agentMcp"]')!.textContent).toBe('复制');
    expect(f.document.querySelector('#toast')!.textContent).toContain('手动复制');
  });

  it('重复复制后恢复原标签，等待剪贴板时不重复提交', async () => {
    vi.useFakeTimers();
    try {
      const f = page();
      const button = f.document.querySelector('[data-agent-copy="agentExample0"]')!;
      const click = () => button.dispatchEvent(new f.window.Event('click', { bubbles: true }));
      let finish!: () => void;
      f.copy.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
      click(); click();
      expect(f.copy).toHaveBeenCalledTimes(1);
      finish();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      click();
      await vi.advanceTimersByTimeAsync(1000);
      expect(button.textContent).toBe('已复制');
      await vi.advanceTimersByTimeAsync(600);
      expect(button.textContent).toBe('复制问题');
    } finally { vi.useRealTimers(); }
  });

  it('数据自动刷新不重置正在使用的系统、客户端和展开状态', async () => {
    const f = page('Win32', url => url.startsWith('/api/platforms') ? { platforms: [] } : url.startsWith('/api/offers') ? { offers: [] } : {});
    f.choose('[data-agent-skill-client]', 'claude');
    f.choose('[data-agent-mcp-client]', 'cursor');
    f.document.querySelector('[data-agent-os="unix"]')!.dispatchEvent(new f.window.Event('click'));
    f.document.querySelector('details.agent-install')!.removeAttribute('open');
    const command = f.document.querySelector('#agentInstall')!.textContent;
    await f.run('refreshPage()');
    expect(f.document.querySelector('#agentInstall')!.textContent).toBe(command);
    expect(f.document.querySelector('[data-agent-os="unix"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(f.document.querySelector('[data-agent-mcp-client] option:checked')!.getAttribute('value')).toBe('cursor');
    expect(f.document.querySelector('details.agent-install')!.hasAttribute('open')).toBe(false);
  });
});
