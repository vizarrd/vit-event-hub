import { Club, Venue } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  clubFilter: string;
  onClubFilterChange: (value: string) => void;
  venueFilter: string;
  onVenueFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  clubs: Club[];
  venues: Venue[];
  onClearFilters: () => void;
}

export function EventFilters({
  search,
  onSearchChange,
  clubFilter,
  onClubFilterChange,
  venueFilter,
  onVenueFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortOrder,
  onSortOrderChange,
  clubs,
  venues,
  onClearFilters,
}: EventFiltersProps) {
  const hasFilters = search || clubFilter || venueFilter || dateFrom || dateTo;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-card border border-border/50 shadow-card">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Club Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Club</Label>
          <Select value={clubFilter} onValueChange={onClubFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.club_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Venue Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Venue</Label>
          <Select value={venueFilter} onValueChange={onVenueFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.venue_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sort by Date</Label>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <span>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
