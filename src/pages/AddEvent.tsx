import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { VenueConflictModal } from '@/components/events/VenueConflictModal';
import { checkVenueConflict, ConflictEvent, TimeSlot } from '@/lib/venueConflict';
import { Calendar, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';

const eventSchema = z.object({
  event_name: z.string().min(3, 'Event name must be at least 3 characters'),
  description: z.string().optional(),
  venue_id: z.string().min(1, 'Please select a venue'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  registration_start: z.string().min(1, 'Registration start is required'),
  registration_end: z.string().min(1, 'Registration end is required'),
  is_open: z.boolean(),
});

export default function AddEvent() {
  const { user, profile, isSuperAdmin, isClubPoc } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    venue_id: '',
    start_time: '',
    end_time: '',
    registration_start: '',
    registration_end: '',
    is_open: true,
    club_id: '',
  });

  const [venues, setVenues] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Conflict detection state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<ConflictEvent[]>([]);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [currentVenueName, setCurrentVenueName] = useState('');

  useEffect(() => {
    // Check if user has permission to add events
    if (!user || (!isSuperAdmin && !isClubPoc)) {
      navigate('/login');
      return;
    }

    fetchData();
    
    // Set default club for club POCs
    if (isClubPoc && profile?.club_id) {
      setFormData(prev => ({ ...prev, club_id: profile.club_id }));
    }
  }, [user, isSuperAdmin, isClubPoc, profile, navigate]);

  const fetchData = async () => {
    const [venuesRes, clubsRes] = await Promise.all([
      supabase.from('venues').select('*').order('venue_name'),
      supabase.from('clubs').select('*').order('club_name'),
    ]);

    if (venuesRes.data) setVenues(venuesRes.data);
    if (clubsRes.data) setClubs(clubsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const validation = eventSchema.safeParse({
      ...formData,
      is_open: formData.is_open,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check club selection
    if (!formData.club_id) {
      setErrors({ club_id: 'Please select a club' });
      return;
    }

    // Validate dates
    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    const regStart = new Date(formData.registration_start);
    const regEnd = new Date(formData.registration_end);

    if (endTime <= startTime) {
      setErrors({ end_time: 'End time must be after start time' });
      return;
    }

    if (regEnd <= regStart) {
      setErrors({ registration_end: 'Registration end must be after registration start' });
      return;
    }

    if (regEnd > startTime) {
      setErrors({ registration_end: 'Registration must end before event starts' });
      return;
    }

    setLoading(true);

    try {
      // Check for venue conflicts
      const conflictCheck = await checkVenueConflict(
        formData.venue_id,
        formData.start_time,
        formData.end_time
      );

      if (conflictCheck.hasConflict) {
        // Show conflict modal
        const selectedVenue = venues.find(v => v.id === formData.venue_id);
        setCurrentVenueName(selectedVenue?.venue_name || 'Selected Venue');
        setConflictingEvents(conflictCheck.conflictingEvents);
        setSuggestedSlots(conflictCheck.suggestedSlots);
        setConflictModalOpen(true);
        setLoading(false);
        return;
      }

      // No conflicts, proceed with event creation
      await createEvent();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to check venue availability',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const createEvent = async () => {
    try {
      // Convert datetime-local values to proper ISO format for database
      const eventData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        registration_start: new Date(formData.registration_start).toISOString(),
        registration_end: new Date(formData.registration_end).toISOString(),
        created_by: user?.id,
      };

      // Debug: Log the data being sent to database
      console.log('Creating event with data:', eventData);

      const { error } = await supabase.from('events').insert([eventData]);

      if (error) {
        console.error('Database error:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Event created successfully',
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Event creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    // Update form data with suggested slot
    setFormData({
      ...formData,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setConflictModalOpen(false);
    
    // Show success message
    toast({
      title: 'Time Slot Updated',
      description: 'Event times have been updated to the selected available slot.',
    });
  };

  const handleIgnoreConflict = async () => {
    setConflictModalOpen(false);
    
    // Proceed with event creation despite conflict
    toast({
      title: 'Warning',
      description: 'Creating event despite venue conflict. Please coordinate with other organizers.',
      variant: 'destructive',
    });
    
    await createEvent();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Generate datetime-local input value
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Set default dates (tomorrow)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM

    const dayAfter = new Date(tomorrow);
    dayAfter.setHours(17, 0, 0, 0); // 5 PM

    const regStart = new Date();
    const regEnd = new Date(tomorrow);
    regEnd.setHours(8, 0, 0, 0); // 8 AM on event day

    if (!formData.start_time) {
      setFormData(prev => ({
        ...prev,
        start_time: formatDateTimeLocal(tomorrow),
        end_time: formatDateTimeLocal(dayAfter),
        registration_start: formatDateTimeLocal(regStart),
        registration_end: formatDateTimeLocal(regEnd),
      }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
            <h1 className="text-3xl font-bold">Create New Event</h1>
            <p className="text-muted-foreground">Add a new event for your club</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </CardTitle>
              <CardDescription>
                Fill in the details for your event
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="event_name">Event Name *</Label>
                  <Input
                    id="event_name"
                    value={formData.event_name}
                    onChange={(e) => handleInputChange('event_name', e.target.value)}
                    placeholder="Enter event name"
                    className={errors.event_name ? 'border-destructive' : ''}
                  />
                  {errors.event_name && (
                    <p className="text-xs text-destructive">{errors.event_name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Event description (optional)"
                    rows={3}
                  />
                </div>

                {/* Club Selection (Super Admin only) */}
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="club">Club *</Label>
                    <Select
                      value={formData.club_id}
                      onValueChange={(value) => handleInputChange('club_id', value)}
                    >
                      <SelectTrigger className={errors.club_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select club" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.club_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.club_id && (
                      <p className="text-xs text-destructive">{errors.club_id}</p>
                    )}
                  </div>
                )}

                {/* Venue */}
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <Select
                    value={formData.venue_id}
                    onValueChange={(value) => handleInputChange('venue_id', value)}
                  >
                    <SelectTrigger className={errors.venue_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {venue.venue_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.venue_id && (
                    <p className="text-xs text-destructive">{errors.venue_id}</p>
                  )}
                </div>

                {/* Event Timing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Event Start Time *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                      className={errors.start_time ? 'border-destructive' : ''}
                    />
                    {errors.start_time && (
                      <p className="text-xs text-destructive">{errors.start_time}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">Event End Time *</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                      className={errors.end_time ? 'border-destructive' : ''}
                    />
                    {errors.end_time && (
                      <p className="text-xs text-destructive">{errors.end_time}</p>
                    )}
                  </div>
                </div>

                {/* Registration Timing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_start">Registration Start *</Label>
                    <Input
                      id="registration_start"
                      type="datetime-local"
                      value={formData.registration_start}
                      onChange={(e) => handleInputChange('registration_start', e.target.value)}
                      className={errors.registration_start ? 'border-destructive' : ''}
                    />
                    {errors.registration_start && (
                      <p className="text-xs text-destructive">{errors.registration_start}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_end">Registration End *</Label>
                    <Input
                      id="registration_end"
                      type="datetime-local"
                      value={formData.registration_end}
                      onChange={(e) => handleInputChange('registration_end', e.target.value)}
                      className={errors.registration_end ? 'border-destructive' : ''}
                    />
                    {errors.registration_end && (
                      <p className="text-xs text-destructive">{errors.registration_end}</p>
                    )}
                  </div>
                </div>

                {/* Registration Status */}
                <div className="space-y-2">
                  <Label htmlFor="registration_status">Registration Status</Label>
                  <Select
                    value={formData.is_open ? 'open' : 'closed'}
                    onValueChange={(value) => handleInputChange('is_open', value === 'open')}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Event...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Event
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      
      {/* Venue Conflict Modal */}
      <VenueConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflictingEvents={conflictingEvents}
        suggestedSlots={suggestedSlots}
        venueName={currentVenueName}
        onSelectSlot={handleSelectSlot}
        onIgnoreConflict={handleIgnoreConflict}
      />
    </div>
  );
}