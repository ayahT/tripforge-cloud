import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isSameDay, isWeekend, parseISO, startOfDay, startOfMonth, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarRange, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface TimelineRow {
  id: string;
  title: string;
  subtitle?: string;
}

export interface TimelineReservation {
  id: string;
  customer_name: string;
  pickup_date: string;
  return_date: string;
  pickup_location?: string;
  return_location?: string;
  status: string;
  resource_id: string;
}

interface Props {
  rows: TimelineRow[];
  reservations: TimelineReservation[];
  title?: string;
  emptyLabel?: string;
  onReservationClick?: (reservation: TimelineReservation) => void;
  onEmptySlotClick?: (vehicleId: string, date: Date) => void;
}

const DAY_W = 40; // px per day column
const ROW_H = 40;
const LABEL_W = 140;

const statusColor: Record<string, string> = {
  confirmed: 'bg-[#22c55e] text-white',      // Green = confirmed
  available: 'bg-[#22c55e] text-white',      // Green = available
  booked: 'bg-[#dc2626] text-white',         // Red = booked
  reserved: 'bg-[#dc2626] text-white',       // Red = reserved
  pending: 'bg-[#f97316] text-white',        // Orange = pending
  completed: 'bg-[#3b82f6] text-white',      // Blue (fallback)
  maintenance: 'bg-gray-400 text-white',     // Gray = maintenance
  unavailable: 'bg-gray-400 text-white',     // Gray = unavailable
  cancelled: 'bg-gray-400 text-white line-through',
};

const FleetReservationTimeline = ({ rows, reservations, title = 'Reservations Calendar', emptyLabel = 'No items to display.', onReservationClick, onEmptySlotClick }: Props) => {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const visibleDays = getDaysInMonth(anchor);

  const days = useMemo(
    () => Array.from({ length: visibleDays }, (_, i) => addDays(anchor, i)),
    [anchor, visibleDays]
  );
  const windowStart = days[0];
  const windowEnd = days[days.length - 1];

  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      if (statusFilter !== 'all') {
        const s = r.status;
        if (statusFilter === 'confirmed' && s !== 'confirmed' && s !== 'available') return false;
        if (statusFilter === 'booked' && s !== 'booked' && s !== 'reserved') return false;
        if (statusFilter === 'maintenance' && s !== 'maintenance' && s !== 'unavailable') return false;
        if (statusFilter === 'pending' && s !== 'pending') return false;
        if (statusFilter === 'cancelled' && s !== 'cancelled') return false;
      }
      
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        // Only filter out the reservation if it doesn't match the query AND the parent vehicle doesn't match the query.
        // Wait, it's easier to just let reservations pass if they match, OR if the row matches.
        // If we strictly filter reservations by query, we might hide reservations for a vehicle that matches the query.
        // Let's filter reservations ONLY by status. The row filtering is enough to find the vehicle.
        // Actually, if they search "John", they probably only want to see John's booking.
        const matchesRes = r.customer_name.toLowerCase().includes(query) || (r.pickup_location?.toLowerCase().includes(query)) || (r.return_location?.toLowerCase().includes(query));
        
        // Find the vehicle this belongs to
        const vehicle = rows.find(row => row.id === r.resource_id);
        const matchesVehicle = vehicle ? (vehicle.title.toLowerCase().includes(query) || (vehicle.subtitle?.toLowerCase().includes(query) ?? false)) : false;

        if (!matchesRes && !matchesVehicle) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, searchQuery, rows]);

  const reservationsByResource = useMemo(() => {
    const map = new Map<string, TimelineReservation[]>();
    for (const r of filteredReservations) map.set(r.resource_id, [...(map.get(r.resource_id) ?? []), r]);
    return map;
  }, [filteredReservations]);

  const filteredRows = useMemo(() => {
    let result = rows;
    const query = searchQuery.trim().toLowerCase();
    
    if (query) {
      result = result.filter(row => {
        const matchesTitle = row.title.toLowerCase().includes(query);
        const matchesSub = row.subtitle?.toLowerCase().includes(query) ?? false;
        const rowRes = reservationsByResource.get(row.id) ?? [];
        return matchesTitle || matchesSub || rowRes.length > 0;
      });
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(row => {
        const rowRes = reservationsByResource.get(row.id) ?? [];
        return rowRes.length > 0;
      });
    }
    
    return result;
  }, [rows, searchQuery, statusFilter, reservationsByResource]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed / Available</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="booked">Booked / Reserved</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAnchor((d) => subMonths(d, 1))} title="Previous Month">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5 min-w-[150px] justify-start font-normal">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(windowStart, 'MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={anchor}
                onSelect={(d) => { if (d) { setAnchor(startOfMonth(d)); setPickerOpen(false); } }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setAnchor(startOfMonth(new Date()))}>
            Current Month
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAnchor((d) => addMonths(d, 1))} title="Next Month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
          <Button size="sm" className="h-8 px-3 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
            Add Booking
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-background">
        <div className="overflow-auto max-h-[60vh] relative custom-scrollbar">
          <div style={{ minWidth: LABEL_W + DAY_W * visibleDays }}>
            {/* Header row */}
            <div className="flex sticky top-0 z-30 bg-card border-b border-border shadow-sm">
              <div
                className="shrink-0 flex flex-col justify-end px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border sticky left-0 z-40 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                style={{ width: LABEL_W }}
              >
                <span>{format(anchor, 'MMM yyyy')}</span>
              </div>
              {days.map((d) => {
                const today = isSameDay(d, new Date());
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'shrink-0 flex flex-col items-center justify-center py-1.5 border-r border-border text-[11px]',
                      isWeekend(d) && 'bg-muted/30',
                      today && 'bg-accent/10'
                    )}
                    style={{ width: DAY_W }}
                  >
                    <span className={cn('font-semibold tabular-nums leading-tight', today && 'text-accent')}>{format(d, 'dd')}</span>
                    <span className="text-[9px] text-muted-foreground uppercase leading-tight">{format(d, 'EEE')}</span>
                  </div>
                );
              })}
            </div>

          {/* Vehicle rows */}
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">{emptyLabel}</div>
          ) : filteredRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">No vehicles match your filters.</div>
          ) : (
            filteredRows.map((v) => {
              const vRes = reservationsByResource.get(v.id) ?? [];
              return (
                <div key={v.id} className="flex border-b border-border last:border-b-0 relative" style={{ height: ROW_H }}>
                  <div
                    className="shrink-0 flex flex-col justify-center px-3 border-r border-border bg-card sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-accent/5 transition-colors"
                    style={{ width: LABEL_W }}
                  >
                    <p className="text-xs font-semibold text-foreground truncate leading-tight">
                      {v.title}
                    </p>
                    {v.subtitle && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {v.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Day grid background */}
                  <div className="flex relative" style={{ width: DAY_W * visibleDays }}>
                    {days.map((d) => (
                      <div
                        key={d.toISOString()}
                        onClick={() => onEmptySlotClick?.(v.id, d)}
                        className={cn(
                          'shrink-0 border-r border-border/60 h-full cursor-pointer hover:bg-accent/10 transition-colors',
                          isWeekend(d) && 'bg-muted/20',
                          isSameDay(d, new Date()) && 'bg-accent/5'
                        )}
                        style={{ width: DAY_W }}
                      />
                    ))}

                    {/* Reservation bars */}
                    {vRes.map((r) => {
                      let start: Date, end: Date, startRaw: Date, endRaw: Date;
                      try {
                        startRaw = parseISO(r.pickup_date);
                        endRaw = parseISO(r.return_date);
                        start = startOfDay(startRaw);
                        end = startOfDay(endRaw);
                      } catch { return null; }
                      if (end < windowStart || start > windowEnd) return null;
                      const clampedStart = start < windowStart ? windowStart : start;
                      const clampedEnd = end > windowEnd ? windowEnd : end;
                      const offset = differenceInCalendarDays(clampedStart, windowStart);
                      const span = differenceInCalendarDays(clampedEnd, clampedStart) + 1;
                      const left = offset * DAY_W;
                      const width = span * DAY_W;
                      const color = statusColor[r.status] ?? statusColor.confirmed;
                      return (
                        <div
                          key={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReservationClick?.(r);
                          }}
                          title={`${r.customer_name}\nPickup: ${format(startRaw, 'MMM d, yyyy HH:mm')} (${r.pickup_location || 'N/A'})\nReturn: ${format(endRaw, 'MMM d, yyyy HH:mm')} (${r.return_location || 'N/A'})\nStatus: ${r.status}`}
                          className={cn(
                            'absolute top-0 bottom-0 flex items-center justify-between px-2 text-[10px] font-bold overflow-hidden whitespace-nowrap shadow-sm border-r border-background/20 cursor-pointer hover:brightness-110 transition-all',
                            color
                          )}
                          style={{ left, width: Math.max(width, DAY_W) }}
                        >
                          <span className="truncate w-full text-center">
                            {format(startRaw, 'd')} &rarr; {format(endRaw, 'd')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground p-3 bg-card border border-t-0 border-border rounded-b-md shadow-sm">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-[#22c55e]" /> Available / Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-[#dc2626]" /> Reserved / Booked</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-[#f97316]" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-gray-400" /> Maintenance / Unavailable</span>
      </div>
    </div>
  );
};

export default FleetReservationTimeline;