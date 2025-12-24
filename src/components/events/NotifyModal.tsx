import { useState } from 'react';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EmailService } from '@/lib/emailService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, Loader2, CheckCircle } from 'lucide-react';

const emailSchema = z.string().email('Please enter a valid email address');

interface NotifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  eventDetails?: {
    start_time: string;
    end_time: string;
    registration_end: string;
    venues?: { venue_name: string };
  };
}

export function NotifyModal({ open, onOpenChange, eventId, eventName, eventDetails }: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          email: email.trim(),
          event_id: eventId,
          status: 'pending',
        });

      if (dbError) {
        if (dbError.code === '23505') {
          setError('You are already subscribed to notifications for this event.');
        } else {
          throw dbError;
        }
      } else {
        setSuccess(true);
        toast({
          title: 'Subscribed!',
          description: 'You will receive a reminder 2 hours before registration ends.',
        });

        // Send welcome email if event details are provided
        if (eventDetails) {
          try {
            await EmailService.sendWelcomeEmail({
              email: email.trim(),
              eventId,
              eventName,
              eventDetails
            });
          } catch (emailError) {
            // Don't fail the subscription if email fails
            console.warn('Welcome email failed:', emailError);
          }
        }
        
        setTimeout(() => {
          onOpenChange(false);
          setEmail('');
          setSuccess(false);
        }, 2000);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to subscribe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail('');
      setError('');
      setSuccess(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-4">
            {success ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <Bell className="h-6 w-6 text-accent" />
            )}
          </div>
          <DialogTitle className="text-center">
            {success ? 'Subscribed!' : 'Get Notified'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {success 
              ? 'We\'ll send you a reminder 2 hours before registration ends.'
              : `Enter your email to receive a reminder for "${eventName}" before registration closes.`
            }
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className={error ? 'border-destructive' : ''}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subscribe
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
