import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Event } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { NotifyModal } from './NotifyModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell,
  Edit,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface EventCardProps {
  event: Event;
  onDelete?: (id: string) => void;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const { user, profile, isSuperAdmin } = useAuth();

  const canEdit = user && (
    isSuperAdmin || 
    (profile?.role === 'club_poc' && profile?.club_id === event.club_id)
  );

  const isRegistrationOpen = event.is_open && new Date(event.registration_end) > new Date();
  const isPast = new Date(event.end_time) < new Date();

  return (
    <>
      <Card className="group relative overflow-hidden border-border/50 bg-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
        {/* Status indicator */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isPast ? 'bg-muted' : isRegistrationOpen ? 'bg-success' : 'bg-destructive'
        }`} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Badge variant="secondary" className="mb-2 text-xs">
                {event.clubs?.club_name || 'Unknown Club'}
              </Badge>
              <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {event.event_name}
              </h3>
            </div>
            <Badge variant={isRegistrationOpen ? 'open' : 'closed'}>
              {isPast ? 'Past' : isRegistrationOpen ? 'Open' : 'Closed'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-4">
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-accent" />
              <span>{event.venues?.venue_name || 'TBA'}</span>
              {event.venues?.location && (
                <span className="text-xs">• {event.venues.location}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 text-accent" />
              <span>
                {event.start_time ? format(new Date(event.start_time), 'EEE, MMM dd, yyyy') : 'Date TBA'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>
                {event.start_time && event.end_time ? (
                  `${format(new Date(event.start_time), 'h:mm a')} - ${format(new Date(event.end_time), 'h:mm a')}`
                ) : 'Time TBA'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-xs">
                Registration: {event.registration_start && event.registration_end ? (
                  `${format(new Date(event.registration_start), 'MMM dd, h:mm a')} - ${format(new Date(event.registration_end), 'MMM dd, h:mm a')}`
                ) : 'TBA'}
              </span>
            </div>

            {/* Registration Status - Visible to all users */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isPast ? 'bg-gray-400' : isRegistrationOpen ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs font-medium ${
                isPast ? 'text-gray-500' : isRegistrationOpen ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPast ? 'Event Completed' : isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pt-0 border-t border-border/50 bg-muted/30">
          <div className="flex gap-2 w-full pt-4">
            <Link to={`/event/${event.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-2">
                Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>

            {!isPast && isRegistrationOpen && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => setNotifyOpen(true)}
                className="gap-2"
              >
                <Bell className="h-3 w-3" />
                Notify Me
              </Button>
            )}

            {canEdit && (
              <>
                <Link to={`/edit-event/${event.id}`}>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                {onDelete && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      <NotifyModal
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        eventId={event.id}
        eventName={event.event_name}
        eventDetails={{
          start_time: event.start_time,
          end_time: event.end_time,
          registration_end: event.registration_end,
          venues: event.venues
        }}
      />
    </>
  );
}
