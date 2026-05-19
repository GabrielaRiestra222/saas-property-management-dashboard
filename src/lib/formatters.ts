import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatCurrency(value: string | number, currency = "EUR") {
  const numericValue = typeof value === "number" ? value : Number(value || 0);

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(numericValue) ? 0 : numericValue);
}

export function formatDate(value?: string | null, pattern = "dd MMM yyyy") {
  if (!value) {
    return "-";
  }

  try {
    return format(parseISO(value), pattern, { locale: es });
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

export function fullName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(" ");
}
