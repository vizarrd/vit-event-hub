import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, MapPin, Users, ArrowLeft, Edit } from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isSuperAdmin } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

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
      setEvent(data as Event);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
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

  const isRegistrationOpen = event.is_open && new Date(event.registration_end) > new Date();
  const isPast = new Date(event.end_time) < new Date();
  
  // Check if user can edit this event (same club or super admin)
  const canEdit = isSuperAdmin || (profile?.club_id === event.club_id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-2">
                    {event.clubs?.club_name || 'Unknown Club'}
                  </Badge>
                  <CardTitle className="text-2xl lg:text-3xl mb-2">
                    {event.event_name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        isPast ? 'bg-gray-400' : isRegistrationOpen ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`font-medium ${
                        isPast ? 'text-gray-500' : isRegistrationOpen ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPast ? 'Event Completed' : isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
                      </span>
                    </div>
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/edit-event/${event.id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Event Description */}
              {event.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">About This Event</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Event Details</h3>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_time), 'EEEE, MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Venue</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venues?.venue_name || 'TBA'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registration Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Registration</h3>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Registration Period</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.registration_start), 'MMM dd, yyyy h:mm a')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        to {format(new Date(event.registration_end), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isPast ? 'bg-gray-400' : isRegistrationOpen ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isPast ? 'text-gray-500' : isRegistrationOpen ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPast ? 'Event Completed' : isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className={canEdit ? "flex-1" : "w-full"}
                >
                  Back to Events
                </Button>
                {canEdit && (
                  <Button 
                    onClick={() => navigate(`/edit-event/${event.id}`)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}