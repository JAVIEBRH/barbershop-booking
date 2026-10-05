export function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}
