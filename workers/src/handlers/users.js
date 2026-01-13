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

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function handleUsers(request, env, ctx) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/v1/users', '')
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
    const limit = parseInt(url.searchParams.get('limit')) || 10
    const offset = (page - 1) * limit

    try {
      let whereClause = '1=1'
      let params = []

      if (search) {
        whereClause += ' AND (name LIKE ? OR email LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
      }

      const countQuery = await env.order_2025_db.prepare(
        `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`
      ).bind(...params).first()

      const dataQuery = await env.order_2025_db.prepare(
        `SELECT id, name, email, role, status, created_at, updated_at
         FROM users
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
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

  if (method === 'GET' && path.startsWith('/')) {
    const userId = path.split('/')[1]
    try {
      const result = await env.order_2025_db.prepare(
        'SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?'
      ).bind(userId).first()

      if (!result) {
        return new Response(JSON.stringify({ message: 'User tidak ditemukan' }), {
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

  if (method === 'POST') {
    const data = await request.json()

    if (!data.name || !data.email) {
      return new Response(JSON.stringify({ message: 'Nama dan email wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!data.password) {
      return new Response(JSON.stringify({ message: 'Password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      // Check if email already exists
      const existing = await env.order_2025_db.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(data.email).first()

      if (existing) {
        return new Response(JSON.stringify({ message: 'Email sudah digunakan' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const passwordHash = await hashPassword(data.password)

      const result = await env.order_2025_db.prepare(
        `INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        data.name,
        data.email,
        passwordHash,
        data.role || 'user',
        data.status || 'active',
        new Date().toISOString(),
        new Date().toISOString()
      ).run()

      return new Response(JSON.stringify({
        id: result.meta.last_row_id,
        name: data.name,
        email: data.email,
        role: data.role || 'user',
        status: data.status || 'active'
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

  if (method === 'PUT' && path.startsWith('/')) {
    const userId = path.split('/')[1]
    const data = await request.json()

    try {
      const existing = await env.order_2025_db.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(userId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'User tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      let updateFields = 'name = ?, email = ?, role = ?, status = ?, updated_at = ?'
      let params = [data.name, data.email, data.role, data.status, new Date().toISOString(), userId]

      // If password is provided, update it
      if (data.password) {
        const passwordHash = await hashPassword(data.password)
        updateFields = 'name = ?, email = ?, password_hash = ?, role = ?, status = ?, updated_at = ?'
        params = [data.name, data.email, passwordHash, data.role, data.status, new Date().toISOString(), userId]
      }

      await env.order_2025_db.prepare(
        `UPDATE users SET ${updateFields} WHERE id = ?`
      ).bind(...params).run()

      return new Response(JSON.stringify({
        id: parseInt(userId),
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status
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

  if (method === 'DELETE' && path.startsWith('/')) {
    const userId = path.split('/')[1]

    try {
      const existing = await env.order_2025_db.prepare(
        'SELECT id FROM users WHERE id = ?'
      ).bind(userId).first()

      if (!existing) {
        return new Response(JSON.stringify({ message: 'User tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Don't allow deleting yourself
      if (parseInt(userId) === auth.id) {
        return new Response(JSON.stringify({ message: 'Tidak dapat menghapus user yang sedang digunakan' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare(
        'DELETE FROM users WHERE id = ?'
      ).bind(userId).run()

      return new Response(JSON.stringify({ message: 'User berhasil dihapus' }), {
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
