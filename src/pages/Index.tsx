import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Event, Club, Venue } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Sparkles, Users, MapPin, Loader2 } from 'lucide-react';

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { user, isSuperAdmin, isClubPoc } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [eventsRes, clubsRes, venuesRes] = await Promise.all([
      supabase.from('events').select('*, clubs(*), venues(*)').order('start_time', { ascending: true }),
      supabase.from('clubs').select('*'),
      supabase.from('venues').select('*'),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data as Event[]);
    if (clubsRes.data) setClubs(clubsRes.data as Club[]);
    if (venuesRes.data) setVenues(venuesRes.data as Venue[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Event deleted successfully' });
      setEvents(events.filter((e) => e.id !== id));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setClubFilter('');
    setVenueFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredEvents = events
    .filter((event) => {
      const matchesSearch = !search || 
        event.event_name.toLowerCase().includes(search.toLowerCase()) ||
        event.description?.toLowerCase().includes(search.toLowerCase());
      const matchesClub = !clubFilter || clubFilter === 'all' || event.club_id === clubFilter;
      const matchesVenue = !venueFilter || venueFilter === 'all' || event.venue_id === venueFilter;
      const matchesDateFrom = !dateFrom || new Date(event.start_time) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(event.start_time) <= new Date(dateTo + 'T23:59:59');
      return matchesSearch && matchesClub && matchesVenue && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      const dateA = new Date(a.start_time).getTime();
      const dateB = new Date(b.start_time).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground/80 mb-6">
              <Sparkles className="h-4 w-4" />
              Powered by OSPC Club
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              VIT Chennai<br />Event Scheduler
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Streamline your club events. Discover, register, and never miss an opportunity.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#events">
                <Button variant="default" size="lg" className="bg-white text-primary shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-300 font-semibold px-8">
                  Browse Events
                </Button>
              </a>
              {!user && (
                <Link to="/login">
                  <Button variant="outline" size="lg" className="bg-white text-primary shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-300 font-semibold px-8 border-white">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Calendar, label: 'Events', value: events.length },
              { icon: Users, label: 'Clubs', value: clubs.length },
              { icon: MapPin, label: 'Venues', value: venues.length },
              { icon: Sparkles, label: 'Open Now', value: events.filter(e => e.is_open).length },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-primary-foreground/5 backdrop-blur-sm">
                <stat.icon className="h-6 w-6 text-primary-foreground/60 mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-xs text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-16 container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Upcoming Events</h2>
          <p className="text-muted-foreground">Discover and register for exciting events across campus</p>
        </div>

        <EventFilters
          search={search}
          onSearchChange={setSearch}
          clubFilter={clubFilter}
          onClubFilterChange={setClubFilter}
          venueFilter={venueFilter}
          onVenueFilterChange={setVenueFilter}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          clubs={clubs}
          venues={venues}
          onClearFilters={clearFilters}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onDelete={(isSuperAdmin || isClubPoc) ? handleDelete : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 VIT Chennai Event Scheduler. Developed by OSPC Club.</p>
        </div>
      </footer>
    </div>
  );
}
