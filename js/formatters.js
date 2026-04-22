export const DECIMAL_UNITS = {
  MB: 1_000 ** 2,
  GB: 1_000 ** 3,
  TB: 1_000 ** 4,
};

export const BINARY_UNITS = {
  MiB: 1_024 ** 2,
  GiB: 1_024 ** 3,
  TiB: 1_024 ** 4,
};

export const SIZE_UNITS = {
  ...DECIMAL_UNITS,
  ...BINARY_UNITS,
};

export const FOUR_MIB = 4 * BINARY_UNITS.MiB;

export function toBytes(value, unit) {
  const numericValue = Number(value) || 0;
  const multiplier = SIZE_UNITS[unit] ?? 1;
  return numericValue * multiplier;
}

export function bytesToGiB(bytes) {
  return bytes / BINARY_UNITS.GiB;
}

export function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safeDivide(numerator, denominator, fallback = 0) {
  if (!denominator) {
    return fallback;
  }

  return numerator / denominator;
}

export function formatNumber(value, maxFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatInteger(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(value) ? value : 0));
}

export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatBytesShort(bytes) {
  const absolute = Math.abs(bytes);

  if (absolute >= BINARY_UNITS.TiB) {
    return `${formatNumber(bytes / BINARY_UNITS.TiB)} TiB`;
  }

  if (absolute >= BINARY_UNITS.GiB) {
    return `${formatNumber(bytes / BINARY_UNITS.GiB)} GiB`;
  }

  if (absolute >= BINARY_UNITS.MiB) {
    return `${formatNumber(bytes / BINARY_UNITS.MiB)} MiB`;
  }

  return `${formatNumber(bytes)} B`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
