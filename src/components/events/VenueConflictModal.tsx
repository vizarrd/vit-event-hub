import { format } from 'date-fns';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConflictEvent, TimeSlot } from '@/lib/venueConflict';
import { AlertTriangle, Clock, MapPin, Calendar } from 'lucide-react';

interface VenueConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictingEvents: ConflictEvent[];
  suggestedSlots: TimeSlot[];
  venueName: string;
  onSelectSlot: (slot: TimeSlot) => void;
  onIgnoreConflict: () => void;
}

export function VenueConflictModal({
  open,
  onOpenChange,
  conflictingEvents,
  suggestedSlots,
  venueName,
  onSelectSlot,
  onIgnoreConflict
}: VenueConflictModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Venue Booking Conflict
          </DialogTitle>
          <DialogDescription>
            The selected venue and time conflicts with existing events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflicting Events */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Conflicts at {venueName}
            </h3>
            <div className="space-y-3">
              {conflictingEvents.map((event) => (
                <Alert key={event.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-semibold">{event.event_name}</div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.start_time), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_time), 'h:mm a')} - 
                          {format(new Date(event.end_time), 'h:mm a')}
                        </span>
                        <Badge variant="secondary">
                          {event.clubs.club_name}
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>

          {/* Suggested Alternative Slots */}
          {suggestedSlots.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-success" />
                Available Alternative Slots
              </h3>
              <div className="grid gap-3">
                {suggestedSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        Option {index + 1}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(slot.start_time), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(slot.start_time), 'h:mm a')} - 
                          {format(new Date(slot.end_time), 'h:mm a')}
                        </span>
                        <Badge variant="outline" className="text-success border-success">
                          Available
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectSlot(slot)}
                      className="border-success text-success hover:bg-success hover:text-success-foreground"
                    >
                      Select This Slot
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestedSlots.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No alternative slots are available for this venue on the selected date. 
                Please choose a different venue or date.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {suggestedSlots.length === 0 && (
            <Button
              variant="destructive"
              onClick={onIgnoreConflict}
            >
              Create Anyway
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}