import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get holidays within next 2 days
    const today = new Date()
    const twoDaysLater = new Date(today)
    twoDaysLater.setDate(today.getDate() + 2)

    const todayStr = today.toISOString().split('T')[0]
    const futureStr = twoDaysLater.toISOString().split('T')[0]

    const { data: holidays, error: hErr } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', todayStr)
      .lte('holiday_date', futureStr)

    if (hErr) throw hErr
    if (!holidays || holidays.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming holidays' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get all teacher and parent user IDs
    const { data: users, error: uErr } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['teacher', 'parent'])

    if (uErr) throw uErr

    let notificationsInserted = 0

    for (const holiday of holidays) {
      const notifications = (users || []).map(u => ({
        user_id: u.user_id,
        title: `Reminder: ${holiday.title}`,
        message: `${holiday.title} is on ${holiday.holiday_date}${holiday.description ? ' - ' + holiday.description : ''}`,
        type: 'holiday',
        link: u.role === 'teacher' ? '/teacher/holidays' : '/parent/holidays',
      }))

      if (notifications.length > 0) {
        const { error: nErr } = await supabase.from('notifications').insert(notifications)
        if (nErr) console.error('Notification insert error:', nErr)
        else notificationsInserted += notifications.length
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${notificationsInserted} reminders for ${holidays.length} holidays` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
