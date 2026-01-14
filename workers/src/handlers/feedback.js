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

export async function handleFeedback(request, env, ctx) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const path = pathname.replace('/api/v1/feedback', '')
  const method = request.method
  const auth = await verifyToken(request)

  if (!auth) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'GET' && (path === '' || path === '/')) {
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    try {
      const countQuery = await env.order_2025_db.prepare(
        'SELECT COUNT(*) as count FROM feedbacks'
      ).first()

      const dataQuery = await env.order_2025_db.prepare(
        'SELECT id, name, message, created_at FROM feedbacks ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all()

      return new Response(JSON.stringify({
        data: dataQuery.results || [],
        pagination: {
          page,
          limit,
          total: countQuery?.count || 0,
          totalPages: Math.ceil((countQuery?.count || 0) / limit)
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

    if (!data.message) {
      return new Response(JSON.stringify({ message: 'Kritik / saran wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const now = new Date().toISOString()

    try {
      const result = await env.order_2025_db.prepare(
        'INSERT INTO feedbacks (name, message, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        data.name || null,
        data.message,
        auth.id || null,
        now,
        now
      ).run()

      return new Response(JSON.stringify({
        id: result.meta.last_row_id,
        name: data.name || null,
        message: data.message,
        created_at: now
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

  return new Response(JSON.stringify({ message: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}
