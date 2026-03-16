export function generateID(prefix: string, format: string): string {
  const year = new Date().getFullYear();
  const n4 = String(Math.floor(Math.random() * 9000) + 1000);
  const n6 = String(Math.floor(Math.random() * 900000) + 100000);
  const mm = String(new Date().getMonth() + 1).padStart(2, '0');

  switch (format) {
    case 'LAB-YYYY-NNNN': return `${prefix}-${year}-${n4}`;
    case 'LAB-NNNNNN':    return `${prefix}-${n6}`;
    case 'YYYY-MM-NNNN':  return `${year}-${mm}-${n4}`;
    default:              return `${prefix}-${year}-${n4}`;
  }
}
