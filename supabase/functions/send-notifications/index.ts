import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
}

async function sendEmail(emailData: EmailRequest) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'VIT Event Hub <noreply@your-domain.com>', // Replace with your verified domain
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return await response.json()
}

function generateReminderHTML(eventName: string, eventDate: string, eventTime: string, registrationEnd: string, venueName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder - ${eventName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px 20px;
          border-radius: 0 0 10px 10px;
        }
        .event-details {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .detail-item {
          display: flex;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-label {
          font-weight: 600;
          width: 120px;
          color: #666;
        }
        .detail-value {
          color: #333;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .cta {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔔 Registration Reminder</h1>
        <p>Don't miss out on this amazing event!</p>
      </div>
      
      <div class="content">
        <div class="warning">
          <strong>⏰ Hurry up!</strong> Registration for <strong>${eventName}</strong> ends in approximately 2 hours!
        </div>
        
        <div class="event-details">
          <h2>${eventName}</h2>
          <div class="detail-item">
            <div class="detail-label">📅 Date:</div>
            <div class="detail-value">${eventDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">🕐 Time:</div>
            <div class="detail-value">${eventTime}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">📍 Venue:</div>
            <div class="detail-value">${venueName}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">⏰ Registration Ends:</div>
            <div class="detail-value">${registrationEnd}</div>
          </div>
        </div>
        
        <div class="cta">
          <a href="${Deno.env.get('SITE_URL') || 'http://localhost:8080'}" class="button">
            Register Now →
          </a>
        </div>
        
        <p>This is an automated reminder. You received this email because you subscribed to notifications for this event.</p>
      </div>
      
      <div class="footer">
        <p>VIT Event Hub | VIT Chennai</p>
        <p>Stay updated with all campus events!</p>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all pending notifications that need to be sent (2 hours before registration ends)
    const twoHoursFromNow = new Date()
    twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2)

    const { data: notifications, error: notificationsError } = await supabaseClient
      .from('notifications')
      .select(`
        *,
        events!inner(
          event_name,
          start_time,
          end_time,
          registration_end,
          venues(venue_name)
        )
      `)
      .eq('status', 'pending')
      .lte('events.registration_end', twoHoursFromNow.toISOString())
      .gte('events.registration_end', new Date().toISOString())

    if (notificationsError) {
      throw notificationsError
    }

    let emailsSent = 0
    let emailErrors = []

    for (const notification of notifications) {
      try {
        const event = notification.events
        const eventDate = new Date(event.start_time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        const eventTime = `${new Date(event.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} - ${new Date(event.end_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`
        const registrationEnd = new Date(event.registration_end).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        const html = generateReminderHTML(
          event.event_name,
          eventDate,
          eventTime,
          registrationEnd,
          event.venues?.venue_name || 'TBA'
        )

        await sendEmail({
          to: notification.email,
          subject: `⏰ Registration ends soon: ${event.event_name}`,
          html
        })

        // Mark notification as sent
        await supabaseClient
          .from('notifications')
          .update({
            status: 'sent',
            notified_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        emailsSent++
      } catch (error) {
        emailErrors.push({
          notificationId: notification.id,
          email: notification.email,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        totalNotifications: notifications.length,
        errors: emailErrors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})