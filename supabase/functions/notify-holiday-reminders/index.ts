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

    // Get all upcoming holidays (within next 30 days max)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const maxFuture = new Date(today)
    maxFuture.setDate(today.getDate() + 30)
    const maxStr = maxFuture.toISOString().split('T')[0]

    const { data: holidays, error: hErr } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', todayStr)
      .lte('holiday_date', maxStr)

    if (hErr) throw hErr
    if (!holidays || holidays.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming holidays' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Filter holidays where today falls within their reminder window
    const eligibleHolidays = holidays.filter(h => {
      const holidayDate = new Date(h.holiday_date)
      const reminderDays = h.reminder_days ?? 2
      const diffMs = holidayDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= reminderDays
    })

    if (eligibleHolidays.length === 0) {
      return new Response(JSON.stringify({ message: 'No holidays in reminder window' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get all teacher and parent user IDs
    const { data: users, error: uErr } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['teacher', 'parent'])

    if (uErr) throw uErr

    let notificationsInserted = 0

    for (const holiday of eligibleHolidays) {
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
      JSON.stringify({ message: `Sent ${notificationsInserted} reminders for ${eligibleHolidays.length} holidays` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
