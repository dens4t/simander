export function formatCurrency(amount, locale = 'id-ID', currency = 'IDR') {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatNumber(num, locale = 'id-ID') {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat(locale).format(num)
}

export function formatDate(date, options = {}) {
  if (!date) return '-'
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  return new Date(date).toLocaleDateString('id-ID', defaultOptions)
}

export function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatOrderNumber(orderNumber) {
  if (orderNumber === null || orderNumber === undefined || orderNumber === '') return '-'
  const stringValue = String(orderNumber)
  let numericPart = null
  if (stringValue.includes('ORD-')) {
    const parts = stringValue.split('-')
    const lastPart = parts[parts.length - 1]
    const parsed = parseInt(lastPart, 10)
    if (!Number.isNaN(parsed)) numericPart = parsed
  } else {
    const parsed = parseInt(stringValue, 10)
    if (!Number.isNaN(parsed)) numericPart = parsed
  }
  if (numericPart === null) return stringValue
  return String(numericPart).padStart(4, '0')
}

export function getStatusColor(status) {
  const colors = {
    draft: 'badge-draft',
    pending: 'badge-pending',
    approved: 'badge-approved',
    completed: 'badge-completed',
    rejected: 'badge-rejected',
    active: 'badge-active',
    inactive: 'badge-inactive',
    received: 'badge-pending',
    verified: 'badge-approved',
    paid: 'badge-completed'
  }
  return colors[status] || 'badge-draft'
}

export function getStatusLabel(status) {
  const labels = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    completed: 'Selesai',
    rejected: 'Rejected',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    received: 'Diterima',
    verified: 'Diverifikasi',
    paid: 'Dibayar'
  }
  return labels[status] || status
}

export function truncateText(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateOrderNumber() {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return random
}

export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone) {
  const re = /^[0-9+\-\s]{8,15}$/
  return re.test(phone)
}

export function validateNPWP(npwp) {
  const re = /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}\.[0-9]{1}-[0-9]{3}\.[0-9]{3}$/
  return re.test(npwp)
}
