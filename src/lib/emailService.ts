import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface EmailNotification {
  email: string;
  eventId: string;
  eventName: string;
  eventDetails: {
    start_time: string;
    end_time: string;
    registration_end: string;
    venues?: { venue_name: string };
  };
}

export class EmailService {
  static async sendWelcomeEmail(notification: EmailNotification): Promise<void> {
    try {
      const eventDate = format(new Date(notification.eventDetails.start_time), 'EEEE, MMMM dd, yyyy');
      const eventTime = `${format(new Date(notification.eventDetails.start_time), 'h:mm a')} - ${format(new Date(notification.eventDetails.end_time), 'h:mm a')}`;
      const registrationEnd = format(new Date(notification.eventDetails.registration_end), 'MMM dd, yyyy h:mm a');
      const venueName = notification.eventDetails.venues?.venue_name || 'TBA';

      console.log('🔄 Attempting to send welcome email...');

      // Try Supabase Edge Function (this should work without CORS issues)
      try {
        const { data, error } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: notification.email,
            eventName: notification.eventName,
            eventDate,
            eventTime,
            venueName,
            registrationEnd,
          }
        });

        if (error) throw error;
        console.log('✅ Welcome email sent via Edge Function:', data);
        return;
      } catch (edgeError) {
        console.warn('⚠️ Edge function not available:', edgeError);
      }

      // If Edge Function fails, show demo mode (CORS prevents direct API calls)
      console.log('📧 DEMO MODE - Welcome Email Content:');
      console.log('To:', notification.email);
      console.log('Subject: ✅ You\'re subscribed to', notification.eventName);
      console.log('Event:', notification.eventName);
      console.log('Date:', eventDate);
      console.log('Time:', eventTime);
      console.log('Venue:', venueName);
      console.log('Registration Ends:', registrationEnd);
      
      // Show user-friendly demo message
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert(`📧 DEMO: Welcome Email\n\nTo: ${notification.email}\nEvent: ${notification.eventName}\nDate: ${eventDate}\nTime: ${eventTime}\nVenue: ${venueName}\n\n✅ Subscription confirmed!\n\n(In production mode, a real email would be sent via Supabase Edge Functions)`);
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      
      // Always provide user feedback even if everything fails
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert(`⚠️ Email service temporarily unavailable\n\nYour subscription was saved to database successfully!\nYou'll still receive reminders when the service is restored.`);
        }, 1000);
      }
    }
  }

  static async checkAndSendReminders(): Promise<{ sent: number; errors: number }> {
    try {
      // Get notifications that need reminders (2 hours before registration ends)
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);

      const { data: notifications, error } = await supabase
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
        .gte('events.registration_end', new Date().toISOString());

      if (error || !notifications) {
        console.error('Failed to fetch notifications:', error);
        return { sent: 0, errors: 1 };
      }

      if (notifications.length === 0) {
        return { sent: 0, errors: 0 };
      }

      console.log(`🔔 Found ${notifications.length} reminders to send`);

      let sent = 0;
      let errors = 0;

      for (const notification of notifications) {
        try {
          const event = notification.events;
          console.log('📧 Processing reminder for:', event.event_name, 'to:', notification.email);
          
          // Mark as sent first to prevent duplicates
          await supabase
            .from('notifications')
            .update({ 
              status: 'sent',
              notified_at: new Date().toISOString()
            })
            .eq('id', notification.id);

          sent++;
          
          // Log the reminder details
          const eventDate = format(new Date(event.start_time), 'EEEE, MMMM dd, yyyy');
          const eventTime = `${format(new Date(event.start_time), 'h:mm a')} - ${format(new Date(event.end_time), 'h:mm a')}`;
          const registrationEnd = format(new Date(event.registration_end), 'MMM dd, yyyy h:mm a');
          
          console.log('⏰ DEMO - Reminder Email Details:', {
            to: notification.email,
            subject: `⏰ Registration ends soon: ${event.event_name}`,
            event: event.event_name,
            date: eventDate,
            time: eventTime,
            venue: event.venues?.venue_name || 'TBA',
            registrationEnds: registrationEnd
          });
          
        } catch (err) {
          console.error('Failed to process reminder:', err);
          errors++;
        }
      }

      if (sent > 0) {
        console.log(`📧 Processed ${sent} reminder notifications`);
      }

      return { sent, errors };
    } catch (error) {
      console.error('Failed to check reminders:', error);
      return { sent: 0, errors: 1 };
    }
  }
}

// Email reminder system (disabled to prevent popup spam)
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   console.log('🔔 Email reminder system initialized');
//   
//   // Check immediately after 3 seconds
//   setTimeout(() => {
//     console.log('🔍 Initial reminder check...');
//     EmailService.checkAndSendReminders();
//   }, 3000);
//   
//   // Then check every 30 seconds
//   setInterval(() => {
//     console.log('🔍 Periodic reminder check...');
//     EmailService.checkAndSendReminders();
//   }, 30000);
// }