import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { adminHttp } from '../scripts/admin-http';
vi.mock('node:child_process',()=>({spawnSync:vi.fn()}));
afterEach(()=>vi.resetAllMocks());
describe('administrator transport',()=>{
  it('passes credentials over stdin and preserves multiline JSON without shell evaluation',()=>{
    vi.mocked(spawnSync).mockReturnValue({status:0,stdout:'{"ok":true}\n200',stderr:'',pid:1,output:[]} as ReturnType<typeof spawnSync>);
    expect(adminHttp('https://local.test/api/admin/notify/claim','fixture-token',{reason:'line 1\n"line 2" $(`literal`)'})).toEqual({status:200,data:{ok:true}});
    const [command,args,options]=vi.mocked(spawnSync).mock.calls[0];
    expect(command).toBe('curl');
    expect(args).not.toContain('fixture-token');
    expect(options?.input).toContain('Authorization: Bearer fixture-token');
    expect(options?.input).toContain('request = "POST"');
    expect(args).not.toContain('--location');
  });
  it('never retries a failed mutation or exposes credential-bearing diagnostics',()=>{
    vi.mocked(spawnSync).mockReturnValue({status:1,stdout:'',stderr:'fixture-token',pid:1,output:[]} as ReturnType<typeof spawnSync>);
    expect(()=>adminHttp('https://local.test/api/admin/notify/claim','fixture-token',{})).toThrow('未自动重试');
    expect(vi.mocked(spawnSync)).toHaveBeenCalledTimes(1);
  });
});
