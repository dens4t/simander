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

export async function handleBidang(request, env, ctx) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const path = pathname.replace('/api/v1/bidang', '')
  const method = request.method
  const auth = await verifyToken(request)

  if (!auth) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'GET' && (path === '' || path === '/')) {
    const search = url.searchParams.get('search') || ''
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 50
    const offset = (page - 1) * limit

    try {
      let whereClause = 'status = ?'
      const params = ['active']

      if (search) {
        whereClause += ' AND (nama_bidang LIKE ? OR kode_bidang LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
      }

      const countQuery = await env.order_2025_db.prepare(
        `SELECT COUNT(*) as count FROM bidang WHERE ${whereClause}`
      ).bind(...params).first()

      const dataQuery = await env.order_2025_db.prepare(
        `SELECT id, nama_bidang, kode_bidang, status, created_at, updated_at
         FROM bidang WHERE ${whereClause} ORDER BY nama_bidang ASC LIMIT ? OFFSET ?`
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
    const bidangId = path.split('/')[1]

    try {
      const result = await env.order_2025_db.prepare(
        'SELECT id, nama_bidang, kode_bidang, status, created_at, updated_at FROM bidang WHERE id = ?'
      ).bind(bidangId).first()

      if (!result) {
        return new Response(JSON.stringify({ message: 'Bidang tidak ditemukan' }), {
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

    if (!data.nama_bidang || !data.kode_bidang) {
      return new Response(JSON.stringify({ message: 'Nama bidang dan kode bidang wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const result = await env.order_2025_db.prepare(
        `INSERT INTO bidang (nama_bidang, kode_bidang, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        data.nama_bidang,
        data.kode_bidang,
        data.status || 'active',
        new Date().toISOString(),
        new Date().toISOString()
      ).run()

      return new Response(JSON.stringify({
        id: result.meta.last_row_id,
        nama_bidang: data.nama_bidang,
        kode_bidang: data.kode_bidang
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
    const bidangId = path.split('/')[1]
    const data = await request.json()

    try {
      const existing = await env.order_2025_db.prepare(
        'SELECT id, nama_bidang, kode_bidang, status FROM bidang WHERE id = ?'
      ).bind(bidangId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'Bidang tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        'UPDATE bidang SET nama_bidang = ?, kode_bidang = ?, status = ?, updated_at = ? WHERE id = ?'
      ).bind(
        data.nama_bidang || existing.nama_bidang,
        data.kode_bidang || existing.kode_bidang,
        data.status || existing.status,
        new Date().toISOString(),
        bidangId
      ).run()

      return new Response(JSON.stringify({ message: 'Bidang berhasil diupdate' }), {
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
    const bidangId = path.split('/')[1]

    try {
      const existing = await env.order_2025_db.prepare(
        'SELECT id FROM bidang WHERE id = ?'
      ).bind(bidangId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'Bidang tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        'DELETE FROM bidang WHERE id = ?'
      ).bind(bidangId).run()

      return new Response(JSON.stringify({ message: 'Bidang berhasil dihapus' }), {
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
