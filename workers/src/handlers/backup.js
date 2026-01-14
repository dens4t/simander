const JWT_SECRET = 'your-jwt-secret-key-change-in-production'

function base64UrlDecode(str) {
  let normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4) normalized += '='
  return atob(normalized)
}

async function verifyToken(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const tokenString = authHeader.substring(7)
  try {
    const parts = tokenString.split('.')
    if (parts.length !== 3) return null
    const [header, payloadBase64, signature] = parts

    const encoder = new TextEncoder()
    const keyData = encoder.encode(JWT_SECRET)
    const messageData = encoder.encode(`${header}.${payloadBase64}`)

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedSignature) return null

    const payload = JSON.parse(base64UrlDecode(payloadBase64))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function escapeIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function escapeValue(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }
  if (typeof value === 'boolean') return value ? '1' : '0'
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
  return `'${stringValue.replace(/'/g, "''")}'`
}

async function buildSqlDump(env) {
  const tableNames = [
    'users',
    'vendors',
    'orders',
    'subkegiatan',
    'audit_logs',
    'feedbacks'
  ]

  const lines = [
    `-- Backup generated at ${new Date().toISOString()}`,
    '-- Schema is assumed to exist; data only',
    'BEGIN TRANSACTION;'
  ]

  for (const tableName of tableNames) {
    const tableInfo = await env.order_2025_db
      .prepare(`PRAGMA table_info(${escapeIdentifier(tableName)})`)
      .all()

    const columns = (tableInfo.results || []).map(column => column.name)
    if (columns.length === 0) continue

    lines.push(`-- Table: ${tableName}`)
    lines.push(`DELETE FROM ${escapeIdentifier(tableName)};`)

    const rows = await env.order_2025_db
      .prepare(`SELECT * FROM ${escapeIdentifier(tableName)}`)
      .all()

    for (const row of rows.results || []) {
      const values = columns.map(column => escapeValue(row[column]))
      const columnList = columns.map(escapeIdentifier).join(', ')
      lines.push(
        `INSERT INTO ${escapeIdentifier(tableName)} (${columnList}) VALUES (${values.join(', ')});`
      )
    }
  }

  lines.push('COMMIT;')
  return lines.join('\n')
}


function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const nextChar = sql[index + 1]

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false
        index += 1
      }
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true
        index += 1
        continue
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true
        index += 1
        continue
      }
    }

    if (char === "'" && !inDoubleQuote) {
      current += char
      if (inSingleQuote && nextChar === "'") {
        current += nextChar
        index += 1
        continue
      }
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      current += char
      continue
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

async function execSql(env, sql) {
  if (typeof env.order_2025_db.exec === 'function') {
    await env.order_2025_db.exec(sql)
    return { statements: null }
  }

  const statements = splitSqlStatements(sql)
  for (const statement of statements) {
    await env.order_2025_db.prepare(statement).run()
  }

  return { statements: statements.length }
}

export async function handleBackup(request, env, ctx) {
  const method = request.method
  const auth = await verifyToken(request)

  if (!auth || auth.role !== 'admin') {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'GET') {
    try {
      const sqlDump = await buildSqlDump(env)
      return new Response(sqlDump, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': 'attachment; filename="backup-order.sql"'
        }
      })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ message: 'Method not allowed' }), {

    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}
