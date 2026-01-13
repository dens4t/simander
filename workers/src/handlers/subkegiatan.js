const JWT_SECRET = 'your-jwt-secret-key-change-in-production'

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
    
    const payload = JSON.parse(atob(payloadBase64))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

async function resolveSubkegiatanNameColumn(env) {
  const tableInfo = await env.order_2025_db.prepare(
    "PRAGMA table_info(subkegiatan)"
  ).all()
  const columns = (tableInfo.results || []).map(column => column.name)
  const nameColumn = ["subkegitan", "subkegiatan", "name", "nama"].find(column => columns.includes(column))
  return { nameColumn, columns }
}

export async function handleSubkegiatan(request, env, ctx) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const path = pathname.replace('/api/v1/subkegiatan', '')
  const method = request.method
  const auth = await verifyToken(request)

  if (!auth) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let nameColumn = null
  try {
    const resolved = await resolveSubkegiatanNameColumn(env)
    nameColumn = resolved.nameColumn
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!nameColumn) {
    return new Response(JSON.stringify({ message: 'Kolom nama subkegiatan tidak ditemukan di database' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const selectFields = `id, ${nameColumn} AS subkegiatan, ppk, status, created_at, updated_at`

  if (method === 'GET' && (path === '' || path === '/')) {
    const search = url.searchParams.get('search') || ''
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 50
    const offset = (page - 1) * limit

    try {
      let whereClause = 'status = ?'
      let params = ['active']

      if (search) {
        whereClause += ` AND (${nameColumn} LIKE ? OR ppk LIKE ?)`
        params.push(`%${search}%`, `%${search}%`)
      }

      const countQuery = await env.order_2025_db.prepare(
        `SELECT COUNT(*) as count FROM subkegiatan WHERE ${whereClause}`
      ).bind(...params).first()

      const dataQuery = await env.order_2025_db.prepare(
        `SELECT ${selectFields} FROM subkegiatan WHERE ${whereClause} ORDER BY ${nameColumn} ASC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all()

      return new Response(JSON.stringify({
        data: dataQuery.results,
        pagination: {
          page,
          limit,
          total: countQuery.count,
          totalPages: Math.ceil(countQuery.count / limit)
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'GET' && /^\/\d+$/.test(path)) {
    const subkegiatanId = path.split('/')[1]
    try {
      const result = await env.order_2025_db.prepare(
        `SELECT ${selectFields} FROM subkegiatan WHERE id = ?`
      ).bind(subkegiatanId).first()

      if (!result) {
        return new Response(JSON.stringify({ message: 'Subkegiatan tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'POST' && (path === '' || path === '/')) {
    const data = await request.json()

    if (!data.subkegiatan) {
      return new Response(JSON.stringify({ message: 'Nama subkegiatan wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const result = await env.order_2025_db.prepare(
        `INSERT INTO subkegiatan (${nameColumn}, ppk, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        data.subkegiatan,
        data.ppk || '',
        data.status || 'active',
        new Date().toISOString(),
        new Date().toISOString()
      ).run()

      return new Response(JSON.stringify({ 
        id: result.meta.last_row_id,
        subkegiatan: data.subkegiatan,
        ppk: data.ppk || ''
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'PUT' && /^\/\d+$/.test(path)) {
    const subkegiatanId = path.split('/')[1]
    const data = await request.json()

    try {
      const existing = await env.order_2025_db.prepare(
        `SELECT ${selectFields} FROM subkegiatan WHERE id = ?`
      ).bind(subkegiatanId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'Subkegiatan tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        `UPDATE subkegiatan SET ${nameColumn} = ?, ppk = ?, status = ?, updated_at = ? WHERE id = ?`
      ).bind(
        data.subkegiatan || existing.subkegiatan,
        data.ppk !== undefined ? data.ppk : existing.ppk,
        data.status || existing.status,
        new Date().toISOString(),
        subkegiatanId
      ).run()

      return new Response(JSON.stringify({ message: 'Subk berhasil diupdate' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'DELETE' && /^\/\d+$/.test(path)) {
    const subkegiatanId = path.split('/')[1]

    try {
      const existing = await env.order_2025_db.prepare(
        `SELECT ${selectFields} FROM subkegiatan WHERE id = ?`
      ).bind(subkegiatanId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'Subk tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        'DELETE FROM subkegiatan WHERE id = ?'
      ).bind(subkegiatanId).run()

      return new Response(JSON.stringify({ message: 'Subk berhasil dihapus' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
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
