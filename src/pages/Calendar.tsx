import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllVehicles } from '@/hooks/use-vehicles';
import FleetReservationTimeline from '@/components/agency-admin/FleetReservationTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Label } from '@/components/ui/label';

const useAllBookings = () => {
  return useQuery({
    queryKey: ['all-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, agencies(name)')
        .not('vehicle_id', 'is', null)
        .order('pickup_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

const Calendar = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useAllVehicles();
  const { data: reservations = [], isLoading: reservationsLoading } = useAllBookings();

  return (
    <>
      <div className="space-y-6 w-full max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.2em] mb-1">Schedule</p>
          <h1 className="text-[30px] font-display font-bold text-foreground leading-tight">Global Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">View all vehicle reservations across all agencies</p>
        </motion.div>

        {vehiclesLoading || reservationsLoading ? (
          <div className="w-full space-y-4">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="bg-card rounded-xl border shadow-sm p-4 overflow-hidden">
              <FleetReservationTimeline
                title="Global Fleet Schedule"
                emptyLabel="No vehicles found in the system."
                rows={vehicles.map((v) => ({
                  id: v.id,
                  title: `${v.brand} ${v.model}`,
                  subtitle: `${v.agency_name} ${v.license_plate ? `· ${v.license_plate}` : ''}`,
                }))}
                reservations={reservations.map((r: any) => ({
                  id: r.id,
                  customer_name: r.customer_name,
                  pickup_date: r.pickup_date,
                  return_date: r.return_date,
                  pickup_location: r.pickup_location,
                  return_location: r.return_location,
                  status: r.status,
                  resource_id: r.vehicle_id,
                }))}
                onReservationClick={(r) => {
                  setSelectedReservation(r);
                  setDetailsOpen(true);
                }}
                onEmptySlotClick={() => {
                  // Superadmin calendar is view-only, do nothing or show a toast
                }}
              />
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <div className="font-medium text-foreground">{selectedReservation.customer_name}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="capitalize">{selectedReservation.status}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Pickup</Label>
                  <div>{format(parseISO(selectedReservation.pickup_date), 'MMM d, yyyy HH:mm')}</div>
                  <div className="text-sm text-muted-foreground">{selectedReservation.pickup_location}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Return</Label>
                  <div>{format(parseISO(selectedReservation.return_date), 'MMM d, yyyy HH:mm')}</div>
                  <div className="text-sm text-muted-foreground">{selectedReservation.return_location}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Calendar;
