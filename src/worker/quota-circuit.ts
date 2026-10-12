// Share the daily D1 circuit between public HTTP, MCP and scheduled work.
let until=0;
export function quotaCircuitOpen(now=Date.now()):boolean {
  if(now>=until){until=0;return false;}return true;
}
export function tripQuotaCircuit(now=Date.now()):void {
  const nextDay=new Date(now);nextDay.setUTCHours(24,5,0,0);until=nextDay.getTime();
}
