import { createClient } from '@supabase/supabase-js'

interface RequestBody {
  gift_id?: string
}

interface ExpoPushResponse {
  data?: {
    status?: 'ok' | 'error'
    message?: string
  }
}

const jsonHeaders = {
  'Content-Type': 'application/json',
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  if (!body.gift_id) {
    return new Response(JSON.stringify({ error: 'gift_id is required' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: gift, error: giftError } = await admin
    .from('karaoke_nword_pass_gifts')
    .select(
      'id, session_id, recipient_guest_id, giver_name_snapshot, notified_at, used_at, revoked_at',
    )
    .eq('id', body.gift_id)
    .maybeSingle()

  if (giftError || !gift) {
    return new Response(JSON.stringify({ error: 'Gift not found' }), {
      status: 404,
      headers: jsonHeaders,
    })
  }
  if (gift.used_at || gift.revoked_at) {
    return new Response(JSON.stringify({ error: 'Gift is no longer pending' }), {
      status: 409,
      headers: jsonHeaders,
    })
  }
  if (gift.notified_at) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: jsonHeaders,
    })
  }

  const { data: recipient, error: recipientError } = await admin
    .from('karaoke_guests')
    .select('push_token, last_active_at')
    .eq('id', gift.recipient_guest_id)
    .eq('session_id', gift.session_id)
    .maybeSingle()

  if (recipientError || !recipient) {
    return new Response(JSON.stringify({ error: 'Recipient not found' }), {
      status: 404,
      headers: jsonHeaders,
    })
  }

  // Claim notification delivery before sending so repeated client retries do
  // not create duplicate banners. Foreground clients still receive the reveal
  // immediately through Realtime, even when this device has no push token.
  const { data: claimed, error: claimError } = await admin
    .from('karaoke_nword_pass_gifts')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', gift.id)
    .is('notified_at', null)
    .select('id')
    .maybeSingle()

  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
  if (!claimed) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: jsonHeaders,
    })
  }
  if (!recipient.push_token) {
    return new Response(JSON.stringify({ ok: true, push: 'unavailable' }), {
      headers: jsonHeaders,
    })
  }

  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipient.push_token,
      sound: 'default',
      title: 'You received an N-Word Pass',
      body:
        gift.giver_name_snapshot +
        ' gifted you a one-time pass for your next eligible song.',
      data: {
        type: 'nword-pass-gift',
        giftId: gift.id,
        sessionId: gift.session_id,
      },
      channelId: 'karaoke',
      priority: 'high',
    }),
  })

  const pushResult = (await pushResponse.json()) as ExpoPushResponse
  if (!pushResponse.ok || pushResult.data?.status === 'error') {
    console.error('[notify-nword-pass] Expo rejected push', pushResult)
    return new Response(
      JSON.stringify({
        error: pushResult.data?.message || 'Expo rejected the notification',
      }),
      { status: 502, headers: jsonHeaders },
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: jsonHeaders,
  })
})
