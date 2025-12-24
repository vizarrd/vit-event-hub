import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailRequest {
  email: string
  eventName: string
  eventDate: string
  eventTime: string
  venueName: string
  registrationEnd: string
}

async function sendWelcomeEmail(emailData: WelcomeEmailRequest) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }

  const html = generateWelcomeHTML(emailData)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'VIT Event Hub <noreply@your-domain.com>', // Replace with your verified domain
      to: [emailData.email],
      subject: `✅ You're subscribed to ${emailData.eventName}`,
      html: html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return await response.json()
}

function generateWelcomeHTML(data: WelcomeEmailRequest) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Confirmed - ${data.eventName}</title>
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
        .success {
          background: #d1fae5;
          border: 1px solid #10b981;
          color: #065f46;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
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
        <h1>✅ Subscription Confirmed!</h1>
        <p>You're all set for notifications</p>
      </div>
      
      <div class="content">
        <div class="success">
          <strong>🎉 Great!</strong> You'll receive a reminder email 2 hours before registration closes.
        </div>
        
        <div class="event-details">
          <h2>${data.eventName}</h2>
          <div class="detail-item">
            <div class="detail-label">📅 Date:</div>
            <div class="detail-value">${data.eventDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">🕐 Time:</div>
            <div class="detail-value">${data.eventTime}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">📍 Venue:</div>
            <div class="detail-value">${data.venueName}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">⏰ Registration Deadline:</div>
            <div class="detail-value">${data.registrationEnd}</div>
          </div>
        </div>
        
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>We'll send you a reminder email 2 hours before registration closes</li>
          <li>Make sure to check your inbox and spam folder</li>
          <li>You can unsubscribe at any time by replying to our emails</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>VIT Event Hub | VIT Chennai</p>
        <p>Keeping you connected with campus events!</p>
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
    const { email, eventName, eventDate, eventTime, venueName, registrationEnd }: WelcomeEmailRequest = await req.json()

    if (!email || !eventName) {
      throw new Error('Missing required fields: email and eventName')
    }

    await sendWelcomeEmail({
      email,
      eventName,
      eventDate,
      eventTime,
      venueName,
      registrationEnd
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully' 
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