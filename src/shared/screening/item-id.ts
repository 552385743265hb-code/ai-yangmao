export function itemId(kind: 'lead' | 'task', id: string | number): string {
  return `${kind}:${id}`;
}
