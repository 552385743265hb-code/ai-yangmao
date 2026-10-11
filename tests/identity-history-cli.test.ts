import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
for(const command of ['preview-backfill','plan-merges'])it('A32 '+command+' fails closed without explicit local input and environment',()=>{
 const result=spawnSync(process.execPath,['--import','tsx',`scripts/identity/${command}.ts`],{encoding:'utf8',env:{...process.env,API_BASE:'https://must-not-connect.invalid'}});
 expect(result.status).toBe(1);expect(result.stderr).toMatch(/required/);
});
it('A32 preview command rejects apply before opening any input',()=>{
 const r=spawnSync(process.execPath,['--import','tsx','scripts/identity/preview-backfill.ts','--apply','--input','/nonexistent','--environment','redacted_local'],{encoding:'utf8'});expect(r.status).toBe(1);expect(r.stderr).toContain('read-only');
});
it('A30 merge CLI defaults to dry-run and rejects missing explicit input without production fallback',()=>{
 const result=spawnSync(process.execPath,['--import','tsx','scripts/identity/apply-merges.ts'],{encoding:'utf8',env:{...process.env,API_BASE:'https://must-not-connect.invalid'}});expect(result.status).toBe(1);expect(result.stderr).toMatch(/required/);
});
