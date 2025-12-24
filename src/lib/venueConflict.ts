import { supabase } from '@/integrations/supabase/client';

export interface ConflictEvent {
  id: string;
  event_name: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  clubs: {
    club_name: string;
  };
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingEvents: ConflictEvent[];
  suggestedSlots: TimeSlot[];
}

export async function checkVenueConflict(
  venueId: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<ConflictCheck> {
  // Convert to Date objects for comparison
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);
  
  // Get the date for the event to check conflicts on the same day
  const eventDate = newStart.toISOString().split('T')[0];
  
  // Query for overlapping events at the same venue on the same date
  let query = supabase
    .from('events')
    .select(`
      id,
      event_name,
      start_time,
      end_time,
      venue_id,
      clubs!inner(club_name)
    `)
    .eq('venue_id', venueId)
    .gte('start_time', `${eventDate}T00:00:00`)
    .lt('start_time', `${eventDate}T23:59:59`);
  
  if (excludeEventId) {
    query = query.neq('id', excludeEventId);
  }
  
  const { data: existingEvents, error } = await query;
  
  if (error) {
    console.error('Error checking venue conflicts:', error);
    return {
      hasConflict: false,
      conflictingEvents: [],
      suggestedSlots: []
    };
  }
  
  const conflictingEvents: ConflictEvent[] = [];
  
  // Check for time overlaps
  existingEvents?.forEach(event => {
    const existingStart = new Date(event.start_time);
    const existingEnd = new Date(event.end_time);
    
    // Check if events overlap
    if (
      (newStart >= existingStart && newStart < existingEnd) || // New event starts during existing event
      (newEnd > existingStart && newEnd <= existingEnd) || // New event ends during existing event
      (newStart <= existingStart && newEnd >= existingEnd) || // New event completely encompasses existing event
      (newStart >= existingStart && newEnd <= existingEnd) // New event is completely within existing event
    ) {
      conflictingEvents.push(event as ConflictEvent);
    }
  });
  
  // Generate suggested slots if there are conflicts
  const suggestedSlots = conflictingEvents.length > 0 
    ? await generateSuggestedSlots(venueId, eventDate, newStart, newEnd, existingEvents || [])
    : [];
  
  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents,
    suggestedSlots
  };
}

async function generateSuggestedSlots(
  venueId: string,
  eventDate: string,
  requestedStart: Date,
  requestedEnd: Date,
  existingEvents: any[]
): Promise<TimeSlot[]> {
  const suggestions: TimeSlot[] = [];
  const eventDuration = requestedEnd.getTime() - requestedStart.getTime();
  
  // Define working hours (9 AM to 9 PM)
  const dayStart = new Date(`${eventDate}T09:00:00`);
  const dayEnd = new Date(`${eventDate}T21:00:00`);
  
  // Sort existing events by start time
  const sortedEvents = existingEvents
    .map(event => ({
      start: new Date(event.start_time),
      end: new Date(event.end_time)
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Check slot before first event
  if (sortedEvents.length > 0) {
    const firstEvent = sortedEvents[0];
    const availableEnd = new Date(firstEvent.start.getTime());
    
    if (dayStart.getTime() + eventDuration <= availableEnd.getTime()) {
      const slotStart = new Date(dayStart);
      const slotEnd = new Date(dayStart.getTime() + eventDuration);
      
      suggestions.push({
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        available: true
      });
    }
  }
  
  // Check slots between events
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEventEnd = sortedEvents[i].end;
    const nextEventStart = sortedEvents[i + 1].start;
    
    const availableDuration = nextEventStart.getTime() - currentEventEnd.getTime();
    
    if (availableDuration >= eventDuration) {
      suggestions.push({
        start_time: currentEventEnd.toISOString(),
        end_time: new Date(currentEventEnd.getTime() + eventDuration).toISOString(),
        available: true
      });
    }
  }
  
  // Check slot after last event
  if (sortedEvents.length > 0) {
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const availableStart = new Date(lastEvent.end);
    
    if (availableStart.getTime() + eventDuration <= dayEnd.getTime()) {
      const slotEnd = new Date(availableStart.getTime() + eventDuration);
      
      suggestions.push({
        start_time: availableStart.toISOString(),
        end_time: slotEnd.toISOString(),
        available: true
      });
    }
  }
  
  // If no existing events, suggest the requested time if within working hours
  if (sortedEvents.length === 0) {
    const requestedStartTime = requestedStart.getTime();
    const requestedEndTime = requestedEnd.getTime();
    
    if (requestedStartTime >= dayStart.getTime() && requestedEndTime <= dayEnd.getTime()) {
      suggestions.push({
        start_time: dayStart.toISOString(),
        end_time: new Date(dayStart.getTime() + eventDuration).toISOString(),
        available: true
      });
    }
  }
  
  // Limit to 3 suggestions and ensure they're within working hours
  return suggestions
    .filter(slot => {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      return start >= dayStart && end <= dayEnd;
    })
    .slice(0, 3);
}

export async function getVenues() {
  const { data: venues, error } = await supabase
    .from('venues')
    .select('*')
    .order('venue_name');
  
  if (error) {
    console.error('Error fetching venues:', error);
    return [];
  }
  
  return venues || [];
}