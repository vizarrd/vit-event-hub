import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isSuperAdmin } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [eventStatus, setEventStatus] = useState<'open' | 'closed' | 'ended'>('open');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clubs(*),
        venues(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event details',
        variant: 'destructive',
      });
      navigate('/');
    } else {
      // Check if user is authorized to edit this event
      const canEdit = isSuperAdmin || (profile?.club_id === data.club_id);
      if (!canEdit) {
        setAuthorized(false);
        toast({
          title: 'Access Denied',
          description: 'You can only edit events from your own club',
          variant: 'destructive',
        });
        navigate(`/event/${id}`);
        return;
      }
      
      setEvent(data as Event);
      // Determine current status
      const now = new Date();
      const eventEnd = new Date(data.end_time);
      const regEnd = new Date(data.registration_end);
      
      if (eventEnd < now) {
        setEventStatus('ended');
      } else if (data.is_open && regEnd > now) {
        setEventStatus('open');
      } else {
        setEventStatus('closed');
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!event || !id) return;

    setSaving(true);
    
    const now = new Date();
    let isOpen = false;
    
    // Determine is_open based on selected status
    if (eventStatus === 'open') {
      isOpen = true;
    } else if (eventStatus === 'closed') {
      isOpen = false;
    } else { // ended
      isOpen = false;
    }

    const { error } = await supabase
      .from('events')
      .update({
        is_open: isOpen,
        updated_at: now.toISOString(),
      })
      .eq('id', id);

    setSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update event status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event status updated successfully',
      });
      navigate(`/event/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  // Double-check authorization (in case user accessed URL directly)
  const canEdit = isSuperAdmin || (profile?.club_id === event.club_id);
  if (!canEdit && authorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to edit this event. You can only edit events from your own club.
                {isSuperAdmin === false && profile?.role !== 'super_admin' && (
                  <span className="block mt-1 text-sm">
                    Super admins can edit any event.
                  </span>
                )}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(`/event/${id}`)}>
              Back to Event Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(`/event/${id}`)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event Details
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Edit Event</CardTitle>
              <CardDescription>
                Update the status of "{event.event_name}"
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Event Info Display */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold">Event Information</h3>
                <p><span className="text-muted-foreground">Name:</span> {event.event_name}</p>
                <p><span className="text-muted-foreground">Club:</span> {event.clubs?.club_name}</p>
                <p><span className="text-muted-foreground">Venue:</span> {event.venues?.venue_name}</p>
                <p><span className="text-muted-foreground">Date:</span> {new Date(event.start_time).toLocaleDateString()}</p>
              </div>

              {/* Status Selection */}
              <div className="space-y-4">
                <Label htmlFor="event-status" className="text-base font-semibold">
                  Event Status
                </Label>
                
                <Select value={eventStatus} onValueChange={(value: 'open' | 'closed' | 'ended') => setEventStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Registration Open
                      </div>
                    </SelectItem>
                    <SelectItem value="closed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Registration Closed
                      </div>
                    </SelectItem>
                    <SelectItem value="ended">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Event Ended
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Description */}
                <div className="p-3 bg-muted/30 rounded text-sm text-muted-foreground">
                  {eventStatus === 'open' && (
                    <p>✅ Students can register for this event. Registration is open.</p>
                  )}
                  {eventStatus === 'closed' && (
                    <p>🔒 Registration is closed. Students cannot register but the event hasn't started yet.</p>
                  )}
                  {eventStatus === 'ended' && (
                    <p>🏁 The event has ended. No registrations are allowed.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/event/${id}`)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  className="flex-1"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}