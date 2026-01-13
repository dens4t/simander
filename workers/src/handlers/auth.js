const JWT_SECRET = 'your-jwt-secret-key-change-in-production'
const BCRYPT_ROUNDS = 10

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

async function generateToken(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadBase64 = base64UrlEncode(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 }))
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(`${header}.${payloadBase64}`)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `${header}.${payloadBase64}.${signature}`
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payloadBase64, signature] = parts
    
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
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

export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/v1/auth/', '')
  const method = request.method

  if (method === 'POST' && path === 'login') {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const results = await env.order_2025_db.prepare(
        'SELECT * FROM users WHERE email = ? AND status = ?'
      ).bind(email, 'active').all()

      if (results.results.length === 0) {
        return new Response(JSON.stringify({ message: 'Email atau password salah' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const user = results.results[0]
      const passwordHash = await hashPassword(password)

      if (user.password_hash !== passwordHash) {
        return new Response(JSON.stringify({ message: 'Email atau password salah' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const token = await generateToken({ id: user.id, email: user.email, role: user.role }, JWT_SECRET)

      console.log('Generated token:', token)

      await env.order_2025_db.prepare(
        'UPDATE users SET last_login = ? WHERE id = ?'
      ).bind(new Date().toISOString(), user.id).run()

      return new Response(JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
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

  if (method === 'POST' && path === 'logout') {
    return new Response(JSON.stringify({ message: 'Logged out' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'GET' && path === 'me') {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, JWT_SECRET)

    if (!payload) {
      return new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const results = await env.order_2025_db.prepare(
        'SELECT id, email, name, role, status FROM users WHERE id = ?'
      ).bind(payload.id).all()

      if (results.results.length === 0) {
        return new Response(JSON.stringify({ message: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(results.results[0]), {
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
