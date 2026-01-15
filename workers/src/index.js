import { handleAuth } from './handlers/auth.js'
import { handleOrders } from './handlers/orders.js'
import { handleVendors } from './handlers/vendors.js'
import { handleUsers } from './handlers/users.js'
import { handleSubkegiatan } from './handlers/subkegiatan.js'
import { handleBidang } from './handlers/bidang.js'
import { handleBackup } from './handlers/backup.js'
import { handleFeedback } from './handlers/feedback.js'



export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = url.pathname
    const method = request.method

    const origin = request.headers.get('origin') || '*'

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      let response = null

      if (pathname.startsWith('/api/v1/auth')) {
        response = await handleAuth(request, env, ctx)
      }
      else if (pathname === '/api/v1/orders' || pathname === '/api/v1/orders/' || pathname.startsWith('/api/v1/orders/')) {
        response = await handleOrders(request, env, ctx)
      }
      else if (pathname === '/api/v1/vendors' || pathname === '/api/v1/vendors/' || pathname.startsWith('/api/v1/vendors/')) {
        response = await handleVendors(request, env, ctx)
      }
      else if (pathname === '/api/v1/users' || pathname === '/api/v1/users/' || pathname.startsWith('/api/v1/users/')) {
        response = await handleUsers(request, env, ctx)
      }
      else if (pathname === '/api/v1/subkegiatan' || pathname === '/api/v1/subkegiatan/' || pathname.startsWith('/api/v1/subkegiatan/')) {
        response = await handleSubkegiatan(request, env, ctx)
      }
      else if (pathname === '/api/v1/bidang' || pathname === '/api/v1/bidang/' || pathname.startsWith('/api/v1/bidang/')) {
        response = await handleBidang(request, env, ctx)
      }
      else if (pathname === '/api/v1/backup' || pathname === '/api/v1/backup/') {

        response = await handleBackup(request, env, ctx)
      }
      else if (pathname === '/api/v1/feedback' || pathname === '/api/v1/feedback/' || pathname.startsWith('/api/v1/feedback/')) {
        response = await handleFeedback(request, env, ctx)
      }
      else if (pathname === '/api/v1/health' || pathname === '/health') {

        response = new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      else {
        response = new Response(JSON.stringify({ error: 'Not Found', path: pathname }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }

      if (response) {
        const newHeaders = new Headers(response.headers)
        for (const [key, value] of Object.entries(corsHeaders)) {
          newHeaders.set(key, value)
        }
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        })
      }

      return new Response(JSON.stringify({ error: 'No handler' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    } catch (error) {
      console.error('Error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
  }
}
