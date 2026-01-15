const JWT_SECRET = 'your-jwt-secret-key-change-in-production'

const DEFAULT_PAKET = { id_paket: '', no_surat_pesanan: '' }
const DEFAULT_KONTRAK_ROW = {
  no: '',
  kode_kontrak: '',
  kode_bidang: '',
  bulan: '',
  tahun: '',
  tgl: '',
  nilai_kwitansi: 0
}
const DEFAULT_INVOICE_ROW = {
  no: '',
  tgl: '',
  nilai_invoice: 0
}
const DEFAULT_BA_ROW = {
  no: '',
  kode_ba: '',
  kode_bidang: '',
  bulan: '',
  tahun: '',
  tgl: '',
  nilai: 0
}

function normalizeJson(value, fallback) {
  if (value === undefined) return fallback
  return JSON.stringify(value)
}

function generateOrderNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `ORD-${year}-${timestamp}`
}

async function resolveOrderColumns(env) {
  const tableInfo = await env.order_2025_db.prepare('PRAGMA table_info(orders)').all()
  const columns = (tableInfo.results || []).map(column => column.name)
  const subkegiatanColumn = ['subkegiatan_id', 'subkegitan_id'].find(column => columns.includes(column))
  return {
    columns,
    subkegiatanColumn,
    hasPaket: columns.includes('paket'),
    hasKontrak: columns.includes('kontrak'),
    hasInvoice: columns.includes('invoice'),
    hasDriveLink: columns.includes('drive_link'),
    hasBa: columns.includes('ba')
  }
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

async function verifyToken(token) {
  const authHeader = token.headers.get('Authorization')
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

async function logAudit(env, entityType, entityId, action, userId, details = null) {
  try {
    await env.order_2025_db.prepare(
      'INSERT INTO audit_logs (entity_type, entity_id, action, user_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(entityType, entityId, action, userId, JSON.stringify(details), new Date().toISOString()).run()
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

export async function handleOrders(request, env, ctx) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const path = pathname.replace('/api/v1/orders', '')
  const method = request.method
  const auth = await verifyToken(request)

  console.log('Orders handler - pathname:', pathname, 'path:', path, 'method:', method, 'auth:', auth)

  if (!auth && path !== '/stats') {
    return new Response(JSON.stringify({ message: 'Unauthorized', debug: { pathname, path, hasAuth: !!auth } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let orderColumns = null
  if (path !== '/stats') {
    try {
      orderColumns = await resolveOrderColumns(env)
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'GET' && path === '/stats') {
    try {
      const total = await env.order_2025_db.prepare('SELECT COUNT(*) as count FROM orders').first()
      const pending = await env.order_2025_db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").first()
      const approved = await env.order_2025_db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'approved'").first()
      const completed = await env.order_2025_db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").first()
      const draft = await env.order_2025_db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'draft'").first()
      const totalValue = await env.order_2025_db.prepare('SELECT SUM(contract_value) as sum FROM orders').first()

      return new Response(JSON.stringify({
        total: total?.count || 0,
        pending: pending?.count || 0,
        approved: approved?.count || 0,
        completed: completed?.count || 0,
        draft: draft?.count || 0,
        totalValue: totalValue?.sum || 0
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

  if (method === 'GET' && (path === '' || path === '/')) {
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const createdBy = url.searchParams.get('created_by') || ''
    const sort = url.searchParams.get('sort') || 'created_at'
    const dir = url.searchParams.get('dir') || 'desc'
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 10
    const offset = (page - 1) * limit


    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'order_date', 'order_number', 'shopping_name', 'contract_value', 'status']
    const sortField = allowedSortFields.includes(sort) ? `o.${sort}` : 'o.created_at'
    const sortDir = dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    try {
      let whereClause = '1=1'
      let params = []

      if (search) {
        whereClause += ' AND (o.order_number LIKE ? OR o.shopping_name LIKE ? OR v.name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (status) {
        whereClause += ' AND o.status = ?'
        params.push(status)
      }

      if (createdBy && auth.role === 'admin') {
        const parsedCreatedBy = parseInt(createdBy, 10)
        if (Number.isNaN(parsedCreatedBy)) {
          return new Response(JSON.stringify({ message: 'created_by tidak valid' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        whereClause += ' AND o.created_by = ?'
        params.push(parsedCreatedBy)
      }


      const countQuery = await env.order_2025_db.prepare(
        `SELECT COUNT(*) as count FROM orders o LEFT JOIN vendors v ON o.vendor_id = v.id WHERE ${whereClause}`
      ).bind(...params).first()

      // Special handling for order_number sort - extract numeric part for proper sorting
      let orderClause
      if (sort === 'order_number') {
        orderClause = `CAST(SUBSTR(o.order_number, -4) AS INTEGER) ${sortDir}`
      } else {
        orderClause = `${sortField} ${sortDir}`
      }

      const subkegiatanJoin = orderColumns?.subkegiatanColumn
        ? `LEFT JOIN subkegiatan s ON o.${orderColumns.subkegiatanColumn} = s.id`
        : ''
      const subkegiatanSelect = orderColumns?.subkegiatanColumn
        ? ', s.subkegiatan as subkegiatan_name, s.ppk as subkegiatan_ppk'
        : ''

      const dataQuery = await env.order_2025_db.prepare(
        `SELECT o.*, v.name as vendor_name, v.npwp as vendor_npwp, u.name as updated_by_name, uc.name as created_by_name${subkegiatanSelect}
         FROM orders o 
         LEFT JOIN vendors v ON o.vendor_id = v.id 
         LEFT JOIN users u ON o.updated_by = u.id
         LEFT JOIN users uc ON o.created_by = uc.id
         ${subkegiatanJoin}
         WHERE ${whereClause} 
         ORDER BY ${orderClause} 
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

  if (method === 'POST' && path === '/bulk') {
    const data = await request.json()
    const action = data?.action
    const rawIds = Array.isArray(data?.order_ids) ? data.order_ids : []
    const orderIds = Array.from(
      new Set(
        rawIds
          .map((value) => parseInt(value, 10))
          .filter((value) => Number.isFinite(value))
      )
    )

    if (orderIds.length === 0) {
      return new Response(JSON.stringify({ message: 'Order belum dipilih' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (action !== 'status' && action !== 'delete') {
      return new Response(JSON.stringify({ message: 'Aksi bulk tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (action === 'status') {
      const allowedStatuses = ['draft', 'pending', 'approved', 'completed']
      if (!allowedStatuses.includes(data?.status)) {
        return new Response(JSON.stringify({ message: 'Status tidak valid' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    const placeholders = orderIds.map(() => '?').join(', ')

    try {
      const rows = await env.order_2025_db.prepare(
        `SELECT id, order_number, created_by FROM orders WHERE id IN (${placeholders})`
      ).bind(...orderIds).all()

      const results = rows.results || []
      if (results.length !== orderIds.length) {
        return new Response(JSON.stringify({ message: 'Sebagian order tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (auth.role !== 'admin') {
        const unauthorized = results.filter((order) => order.created_by !== auth.id)
        if (unauthorized.length > 0) {
          return new Response(JSON.stringify({ message: 'Anda tidak memiliki akses untuk memperbarui order tertentu' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      if (action === 'status') {
        await env.order_2025_db.prepare(
          `UPDATE orders SET status = ?, updated_at = ?, updated_by = ? WHERE id IN (${placeholders})`
        ).bind(data.status, new Date().toISOString(), auth.id, ...orderIds).run()

        for (const order of results) {
          await logAudit(env, 'order', order.id, 'update', auth.id, { status: data.status, bulk: true })
        }

        return new Response(JSON.stringify({
          message: 'Status order berhasil diperbarui',
          updated: results.length
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (action === 'delete') {
        await env.order_2025_db.prepare(
          `DELETE FROM orders WHERE id IN (${placeholders})`
        ).bind(...orderIds).run()

        for (const order of results) {
          await logAudit(env, 'order', order.id, 'delete', auth.id, { order_number: order.order_number, bulk: true })
        }

        return new Response(JSON.stringify({
          message: 'Order berhasil dihapus',
          deleted: results.length
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (method === 'POST' && (path === '' || path === '/')) {
    const data = await request.json()


    if (!data.shopping_name || !data.vendor_id) {
      return new Response(JSON.stringify({ message: 'Nama belanja dan vendor wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const paketValue = normalizeJson(data.paket, JSON.stringify(DEFAULT_PAKET))
      const kontrakValue = normalizeJson(
        Array.isArray(data.kontrak) ? data.kontrak : [],
        JSON.stringify([])
      )
      const invoiceValue = normalizeJson(
        Array.isArray(data.invoice) ? data.invoice : [],
        JSON.stringify([])
      )
      const baValue = normalizeJson(
        Array.isArray(data.ba) ? data.ba : [],
        JSON.stringify([])
      )
      const driveLinkValue = data.drive_link || ''

      const insertColumns = [
        'order_number',
        'order_date',
        'shopping_name',
        'contract_number',
        'vendor_id',
        'contract_value',
        'status',
        'notes'
      ]

      if (orderColumns?.hasPaket) {
        insertColumns.push('paket')
      }
      if (orderColumns?.hasKontrak) {
        insertColumns.push('kontrak')
      }
      if (orderColumns?.hasInvoice) {
        insertColumns.push('invoice')
      }
      if (orderColumns?.hasDriveLink) {
        insertColumns.push('drive_link')
      }
      if (orderColumns?.hasBa) {
        insertColumns.push('ba')
      }
      if (orderColumns?.subkegiatanColumn) {
        insertColumns.push(orderColumns.subkegiatanColumn)
      }

      insertColumns.push('created_by', 'created_at')

      const buildInsertValues = (orderNumber) => {
        const values = [
          orderNumber,
          data.order_date || new Date().toISOString().split('T')[0],
          data.shopping_name,
          data.contract_number || '',
          data.vendor_id,
          data.contract_value || 0,
          data.status || 'draft',
          data.notes || ''
        ]

        if (orderColumns?.hasPaket) {
          values.push(paketValue)
        }
        if (orderColumns?.hasKontrak) {
          values.push(kontrakValue)
        }
        if (orderColumns?.hasInvoice) {
          values.push(invoiceValue)
        }
        if (orderColumns?.hasDriveLink) {
          values.push(driveLinkValue)
        }
        if (orderColumns?.hasBa) {
          values.push(baValue)
        }
        if (orderColumns?.subkegiatanColumn) {
          values.push(data.subkegiatan_id || null)
        }

        values.push(auth.id, new Date().toISOString())
        return values
      }

      const placeholders = insertColumns.map(() => '?').join(', ')
      const runInsert = async (orderNumber) => {
        return env.order_2025_db.prepare(
          `INSERT INTO orders (${insertColumns.join(', ')}) VALUES (${placeholders})`
        ).bind(...buildInsertValues(orderNumber)).run()
      }

      let orderNumber = data.order_number || generateOrderNumber()
      let result = null

      try {
        result = await runInsert(orderNumber)
      } catch (error) {
        const message = String(error?.message || '')
        const isDuplicate = message.toLowerCase().includes('unique') && message.includes('orders.order_number')
        if (isDuplicate && data.order_number) {
          orderNumber = generateOrderNumber()
          result = await runInsert(orderNumber)
        } else {
          throw error
        }
      }

      await logAudit(env, 'order', result.meta.last_row_id, 'create', auth.id, { order_number: orderNumber })

      return new Response(JSON.stringify({ id: result.meta.last_row_id, order_number: orderNumber }), {
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

  const orderId = path.split('/')[1]
  
  if (method === 'GET' && orderId) {
    try {
      const subkegiatanJoin = orderColumns?.subkegiatanColumn
        ? `LEFT JOIN subkegiatan s ON o.${orderColumns.subkegiatanColumn} = s.id`
        : ''
      const subkegiatanSelect = orderColumns?.subkegiatanColumn
        ? ', s.subkegiatan as subkegiatan_name, s.ppk as subkegiatan_ppk'
        : ''

      const result = await env.order_2025_db.prepare(
        `SELECT o.*, v.name as vendor_name, v.email as vendor_email, v.phone as vendor_phone, u.name as updated_by_name, uc.name as created_by_name${subkegiatanSelect}
         FROM orders o 
         LEFT JOIN vendors v ON o.vendor_id = v.id 
         LEFT JOIN users u ON o.updated_by = u.id
         LEFT JOIN users uc ON o.created_by = uc.id
         ${subkegiatanJoin}
         WHERE o.id = ?`
      ).bind(orderId).first()


      if (!result) {
        return new Response(JSON.stringify({ message: 'Order tidak ditemukan' }), {
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

  if (method === 'PUT' && orderId) {
    const data = await request.json()

    try {
      const existing = await env.order_2025_db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
      if (!existing) {
        return new Response(JSON.stringify({ message: 'Order tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (existing.created_by !== auth.id && auth.role !== 'admin') {
        return new Response(JSON.stringify({ message: 'Anda tidak memiliki akses untuk mengedit order ini' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const paketValue = data.paket !== undefined
        ? JSON.stringify(data.paket || DEFAULT_PAKET)
        : existing.paket
      const kontrakValue = data.kontrak !== undefined
        ? JSON.stringify(Array.isArray(data.kontrak) ? data.kontrak : [])
        : existing.kontrak
      const invoiceValue = data.invoice !== undefined
        ? JSON.stringify(Array.isArray(data.invoice) ? data.invoice : [])
        : existing.invoice
      const baValue = data.ba !== undefined
        ? JSON.stringify(Array.isArray(data.ba) ? data.ba : [])
        : existing.ba
      const driveLinkValue = data.drive_link !== undefined ? data.drive_link : existing.drive_link

      const updateParts = [
        'shopping_name = ?',
        'contract_number = ?',
        'vendor_id = ?',
        'contract_value = ?',
        'status = ?',
        'notes = ?'
      ]
      const updateValues = [
        data.shopping_name || existing.shopping_name,
        data.contract_number || existing.contract_number,
        data.vendor_id || existing.vendor_id,
        data.contract_value !== undefined ? data.contract_value : existing.contract_value,
        data.status || existing.status,
        data.notes !== undefined ? data.notes : existing.notes
      ]

      if (orderColumns?.hasPaket) {
        updateParts.push('paket = ?')
        updateValues.push(paketValue)
      }
      if (orderColumns?.hasKontrak) {
        updateParts.push('kontrak = ?')
        updateValues.push(kontrakValue)
      }
      if (orderColumns?.hasInvoice) {
        updateParts.push('invoice = ?')
        updateValues.push(invoiceValue)
      }
      if (orderColumns?.hasDriveLink) {
        updateParts.push('drive_link = ?')
        updateValues.push(driveLinkValue)
      }
      if (orderColumns?.hasBa) {
        updateParts.push('ba = ?')
        updateValues.push(baValue)
      }
      if (orderColumns?.subkegiatanColumn) {
        updateParts.push(`${orderColumns.subkegiatanColumn} = ?`)
        updateValues.push(
          data.subkegiatan_id !== undefined
            ? data.subkegiatan_id
            : existing[orderColumns.subkegiatanColumn]
        )
      }

      updateParts.push('updated_at = ?', 'updated_by = ?')
      updateValues.push(new Date().toISOString(), auth.id, orderId)

      await env.order_2025_db.prepare(
        `UPDATE orders SET ${updateParts.join(', ')} WHERE id = ?`
      ).bind(...updateValues).run()

      await logAudit(env, 'order', orderId, 'update', auth.id, data)

      return new Response(JSON.stringify({ message: 'Order berhasil diupdate' }), {
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

  if (method === 'DELETE' && orderId) {
    try {
      const existing = await env.order_2025_db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
      if (!existing) {
        return new Response(JSON.stringify({ message: 'Order tidak ditemukan' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (existing.created_by !== auth.id && auth.role !== 'admin') {
        return new Response(JSON.stringify({ message: 'Anda tidak memiliki akses untuk menghapus order ini' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.order_2025_db.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run()
      await logAudit(env, 'order', orderId, 'delete', auth.id, { order_number: existing.order_number })

      return new Response(JSON.stringify({ message: 'Order berhasil dihapus' }), {
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
