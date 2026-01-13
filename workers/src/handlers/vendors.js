const JWT_SECRET = 'your-jwt-secret-key-change-in-production'

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
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

export async function handleVendors(request, env, ctx) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/v1/vendors', '')
  const method = request.method
  const auth = await verifyToken(request)

  if (!auth) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'GET' && path === '/search') {
    const query = url.searchParams.get('q') || ''

    try {
      const results = await env.order_2025_db.prepare(
        'SELECT id, name, npwp, email FROM vendors WHERE status = ? AND name LIKE ? LIMIT 10'
      ).bind('active', `%${query}%`).all()

      return new Response(JSON.stringify(results.results), {
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

  if (method === 'GET' && (path === '' || path === '/')) {
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 10
    const offset = (page - 1) * limit

    try {
      let whereClause = '1=1'
      let params = []

      if (search) {
        whereClause += ' AND (name LIKE ? OR npwp LIKE ? OR email LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (status) {
        whereClause += ' AND status = ?'
        params.push(status)
      }

      const countQuery = await env.order_2025_db.prepare(
        `SELECT COUNT(*) as count FROM vendors WHERE ${whereClause}`
      ).bind(...params).first()

      const dataQuery = await env.order_2025_db.prepare(
        `SELECT * FROM vendors WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
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

  if (method === 'POST' && (path === '' || path === '/')) {
    const data = await request.json()

    if (!data.name) {
      return new Response(JSON.stringify({ message: 'Nama vendor wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const result = await env.order_2025_db.prepare(
        `INSERT INTO vendors (name, npwp, email, phone, address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        data.name,
        data.npwp || '',
        data.email || '',
        data.phone || '',
        data.address || '',
        data.status || 'active',
        new Date().toISOString()
      ).run()

      return new Response(JSON.stringify({ id: result.meta.last_row_id, name: data.name }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return new Response(JSON.stringify({ message: 'Nama vendor sudah ada' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  const vendorId = path.split('/')[1]
  
  if (method === 'GET' && vendorId) {
    try {
      const result = await env.order_2025_db.prepare('SELECT * FROM vendors WHERE id = ?').bind(vendorId).first()

      if (!result) {
        return new Response(JSON.stringify({ message: 'Vendor tidak ditemukan' }), {
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

  if (method === 'PUT' && vendorId) {
    const data = await request.json()

    try {
      const existing = await env.order_2025_db.prepare('SELECT * FROM vendors WHERE id = ?').bind(vendorId).first()
      if (!existing) {
        return new Response(JSON.stringify({ message: 'Vendor tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        `UPDATE vendors SET name = ?, npwp = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = ? WHERE id = ?`
      ).bind(
        data.name || existing.name,
        data.npwp !== undefined ? data.npwp : existing.npwp,
        data.email !== undefined ? data.email : existing.email,
        data.phone !== undefined ? data.phone : existing.phone,
        data.address !== undefined ? data.address : existing.address,
        data.status || existing.status,
        new Date().toISOString(),
        vendorId
      ).run()

      return new Response(JSON.stringify({ message: 'Vendor berhasil diupdate' }), {
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

  if (method === 'DELETE' && vendorId) {
    try {
      const existing = await env.order_2025_db.prepare('SELECT * FROM vendors WHERE id = ?').bind(vendorId).first()
      if (!existing) {
        return new Response(JSON.stringify({ message: 'Vendor tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare('DELETE FROM vendors WHERE id = ?').bind(vendorId).run()

      return new Response(JSON.stringify({ message: 'Vendor berhasil dihapus' }), {
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
