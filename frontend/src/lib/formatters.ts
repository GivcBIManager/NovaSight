/**
 * Formatting utilities for numbers, currency, percentages, and dates
 */

// Number formatting with locale support
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  
  // Use compact notation for large numbers
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
      ...options,
    }).format(value)
  }
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

// Currency formatting
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  
  // Use compact notation for large amounts
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      ...options,
    }).format(value)
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

// Percentage formatting
export function formatPercent(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  
  // Assume value is already a decimal (0.15 = 15%)
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(value)
}

// Date formatting
export function formatDate(
  value: string | Date | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  if (!value) return '-'
  
  const date = value instanceof Date ? value : new Date(value)
  
  if (isNaN(date.getTime())) return '-'
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions[format]).format(date)
}

// DateTime formatting
export function formatDateTime(
  value: string | Date | number,
  options?: { dateFormat?: 'short' | 'medium' | 'long'; includeSeconds?: boolean }
): string {
  if (!value) return '-'
  
  const date = value instanceof Date ? value : new Date(value)
  
  if (isNaN(date.getTime())) return '-'
  
  const { dateFormat = 'medium', includeSeconds = false } = options || {}
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  }
  
  const dateStr = formatDate(date, dateFormat)
  const timeStr = new Intl.DateTimeFormat('en-US', timeOptions).format(date)
  
  return `${dateStr} ${timeStr}`
}

// Generic value formatter based on key/format hint
export function formatValue(
  value: unknown,
  format?: 'number' | 'currency' | 'percent' | 'date' | 'datetime' | string
): string {
  if (value === null || value === undefined) {
    return '-'
  }
  
  // Handle string values
  if (typeof value === 'string' && format !== 'date' && format !== 'datetime') {
    return value
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  // Handle numeric values
  if (typeof value === 'number') {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percent':
        return formatPercent(value)
      case 'number':
      default:
        return formatNumber(value)
    }
  }
  
  // Handle date values
  if (format === 'date' || value instanceof Date) {
    return formatDate(value as string | Date)
  }
  
  if (format === 'datetime') {
    return formatDateTime(value as string | Date)
  }
  
  // Fallback to string conversion
  return String(value)
}

// Smart format based on data key name
export function formatByKeyName(value: number, key: string): string {
  const lowerKey = key.toLowerCase()
  
  if (
    lowerKey.includes('percent') ||
    lowerKey.includes('rate') ||
    lowerKey.includes('ratio') ||
    lowerKey.endsWith('_pct')
  ) {
    return formatPercent(value / 100) // Assume value is 0-100
  }
  
  if (
    lowerKey.includes('revenue') ||
    lowerKey.includes('sales') ||
    lowerKey.includes('amount') ||
    lowerKey.includes('price') ||
    lowerKey.includes('cost') ||
    lowerKey.includes('total') ||
    lowerKey.startsWith('$')
  ) {
    return formatCurrency(value)
  }
  
  return formatNumber(value)
}

// Duration formatting (seconds to readable string)
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

// File size formatting
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
