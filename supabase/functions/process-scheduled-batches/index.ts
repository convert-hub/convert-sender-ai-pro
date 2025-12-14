import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BatchData {
  id: string
  block_number: number
  block_size: number
  range_start: number
  range_end: number
  contacts: any[]
  status: string
  scheduled_at: string
  user_id: string
  campaign_id: string
  sheet_meta: any
  column_mapping: any
}

interface CampaignData {
  id: string
  name: string
  objective: string
  ai_instructions: any
}

interface UserSettingsData {
  webhook_url: string
  daily_dispatch_limit: number
  dispatches_today: number
  last_dispatch_date: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date().toISOString()
  console.log(`[${now}] Starting scheduled batch processing...`)

  try {
    // 1. Fetch all scheduled batches that are due
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (batchesError) {
      console.error('Error fetching batches:', batchesError)
      return new Response(JSON.stringify({ error: batchesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!batches || batches.length === 0) {
      console.log('No scheduled batches to process')
      return new Response(JSON.stringify({ processed: 0, message: 'No batches to process' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${batches.length} batch(es) to process`)

    const results: { batchId: string; success: boolean; error?: string }[] = []

    for (const batch of batches as BatchData[]) {
      console.log(`Processing batch ${batch.id} (block ${batch.block_number})...`)

      try {
        // 2. Mark batch as 'sending' to prevent duplicate processing
        const { error: updateSendingError } = await supabase
          .from('batches')
          .update({ status: 'sending' })
          .eq('id', batch.id)
          .eq('status', 'scheduled') // Only update if still scheduled (prevents race conditions)

        if (updateSendingError) {
          console.error(`Error marking batch ${batch.id} as sending:`, updateSendingError)
          results.push({ batchId: batch.id, success: false, error: updateSendingError.message })
          continue
        }

        // 3. Get user settings (webhook URL and daily limit)
        const { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('webhook_url, daily_dispatch_limit, dispatches_today, last_dispatch_date')
          .eq('user_id', batch.user_id)
          .single()

        if (settingsError || !userSettings) {
          console.error(`Error fetching user settings for ${batch.user_id}:`, settingsError)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', undefined, 'User settings not found')
          results.push({ batchId: batch.id, success: false, error: 'User settings not found' })
          continue
        }

        const settings = userSettings as UserSettingsData

        if (!settings.webhook_url) {
          console.error(`No webhook URL configured for user ${batch.user_id}`)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', undefined, 'Webhook URL not configured')
          results.push({ batchId: batch.id, success: false, error: 'Webhook URL not configured' })
          continue
        }

        // 4. Check daily limit
        const { data: limitCheck, error: limitError } = await supabase.rpc('check_daily_limit', {
          _user_id: batch.user_id,
          _contacts_to_send: batch.contacts.length
        })

        if (limitError) {
          console.error(`Error checking daily limit for ${batch.user_id}:`, limitError)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', undefined, 'Error checking daily limit')
          results.push({ batchId: batch.id, success: false, error: 'Error checking daily limit' })
          continue
        }

        if (!limitCheck.allowed) {
          console.log(`Daily limit reached for user ${batch.user_id}. Remaining: ${limitCheck.remaining}`)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', undefined, `Daily limit reached. Remaining: ${limitCheck.remaining}`)
          results.push({ batchId: batch.id, success: false, error: `Daily limit reached. Remaining: ${limitCheck.remaining}` })
          continue
        }

        // 5. Get campaign data
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, objective, ai_instructions')
          .eq('id', batch.campaign_id)
          .single()

        if (campaignError || !campaign) {
          console.error(`Error fetching campaign ${batch.campaign_id}:`, campaignError)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', undefined, 'Campaign not found')
          results.push({ batchId: batch.id, success: false, error: 'Campaign not found' })
          continue
        }

        const campaignData = campaign as CampaignData

        // 6. Build webhook payload
        const payload = {
          source: 'lovable-disparos',
          campaign: {
            id: campaignData.id,
            name: campaignData.name,
            objective: campaignData.objective,
            ai_instructions: campaignData.ai_instructions,
          },
          sheet_meta: batch.sheet_meta,
          mapping: batch.column_mapping,
          batch: {
            block_number: batch.block_number,
            block_size: batch.block_size,
            range: {
              start: batch.range_start,
              end: batch.range_end,
            },
          },
          contacts: batch.contacts,
        }

        console.log(`Sending webhook for batch ${batch.id} to ${settings.webhook_url}`)

        // 7. Send webhook
        const webhookResponse = await fetch(settings.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error(`Webhook failed for batch ${batch.id}: ${webhookResponse.status} - ${errorText}`)
          await updateBatchStatus(supabase, batch.id, 'error')
          await logDispatch(supabase, batch, 'error', webhookResponse.status, `Webhook error: ${errorText}`)
          results.push({ batchId: batch.id, success: false, error: `Webhook error: ${webhookResponse.status}` })
          continue
        }

        console.log(`Webhook successful for batch ${batch.id}`)

        // 8. Update batch status to 'sent'
        await updateBatchStatus(supabase, batch.id, 'sent')

        // 9. Confirm daily dispatch (increment counter)
        await supabase.rpc('confirm_daily_dispatch', {
          _user_id: batch.user_id,
          _contacts_sent: batch.contacts.length
        })

        // 10. Log successful dispatch
        await logDispatch(supabase, batch, 'success', webhookResponse.status)

        console.log(`Batch ${batch.id} processed successfully`)
        results.push({ batchId: batch.id, success: true })

      } catch (batchError) {
        console.error(`Unexpected error processing batch ${batch.id}:`, batchError)
        await updateBatchStatus(supabase, batch.id, 'error')
        await logDispatch(supabase, batch, 'error', undefined, batchError instanceof Error ? batchError.message : 'Unknown error')
        results.push({ batchId: batch.id, success: false, error: batchError instanceof Error ? batchError.message : 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`Processing complete. Success: ${successCount}, Failed: ${failCount}`)

    return new Response(JSON.stringify({
      processed: batches.length,
      success: successCount,
      failed: failCount,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Fatal error in process-scheduled-batches:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function updateBatchStatus(supabase: any, batchId: string, status: string) {
  const { error } = await supabase
    .from('batches')
    .update({ status })
    .eq('id', batchId)

  if (error) {
    console.error(`Error updating batch ${batchId} status to ${status}:`, error)
  }
}

async function logDispatch(
  supabase: any,
  batch: BatchData,
  status: 'success' | 'error',
  responseStatus?: number,
  errorMessage?: string
) {
  const { error } = await supabase
    .from('dispatch_history')
    .insert({
      user_id: batch.user_id,
      batch_id: batch.id,
      block_number: batch.block_number,
      contacts_count: batch.contacts.length,
      status,
      response_status: responseStatus,
      error_message: errorMessage,
    })

  if (error) {
    console.error(`Error logging dispatch for batch ${batch.id}:`, error)
  }
}
