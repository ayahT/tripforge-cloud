import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Agency } from '@/types/agency';
import { useAgencyVehicles } from '@/hooks/use-vehicles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FleetReservationTimeline from '@/components/agency-admin/FleetReservationTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const AgencyAdminCalendar = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [newBookingData, setNewBookingData] = useState<{ vehicleId: string; date: Date } | null>(null);

  const { agency } = useOutletContext<{ agency: Agency }>();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useAgencyVehicles(agency.id);

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['agency-bookings', agency.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, customer_name, pickup_date, return_date, status, vehicle_id, pickup_location, return_location')
        .eq('agency_id', agency.id)
        .not('vehicle_id', 'is', null)
        .order('pickup_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <div className="space-y-6 w-full">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.2em] mb-1">Calendar</p>
        <h1 className="text-[30px] font-display font-bold text-foreground leading-tight">Fleet Reservations</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-light">View and manage your fleet schedule</p>
      </motion.div>

      {vehiclesLoading || reservationsLoading ? (
        <div className="w-full space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
            <FleetReservationTimeline
              title="Calendar View"
              emptyLabel="No vehicles to display."
              rows={vehicles.map((v) => ({
                id: v.id,
                title: `${v.brand} ${v.model}`,
                subtitle: v.license_plate ?? v.serial_number ?? '',
              }))}
              reservations={(reservations as any[]).map((r) => ({
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
              onEmptySlotClick={(vehicleId, date) => {
                setNewBookingData({ vehicleId, date });
                setAddOpen(true);
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Reservation Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Customer</span>
                  <span className="font-medium">{selectedReservation.customer_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <span className="font-medium capitalize">{selectedReservation.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Pickup Date</span>
                  <span className="font-medium">{format(parseISO(selectedReservation.pickup_date), 'PPpp')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Return Date</span>
                  <span className="font-medium">{format(parseISO(selectedReservation.return_date), 'PPpp')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Pickup Location</span>
                  <span className="font-medium">{selectedReservation.pickup_location || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Return Location</span>
                  <span className="font-medium">{selectedReservation.return_location || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Booking Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reservation</DialogTitle>
            <DialogDescription>Create a new booking for the selected vehicle.</DialogDescription>
          </DialogHeader>
          {newBookingData && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Reservation created'); setAddOpen(false); }}>
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select defaultValue={newBookingData.vehicleId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input type="date" defaultValue={format(newBookingData.date, 'yyyy-MM-dd')} required />
                </div>
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Input type="date" defaultValue={format(addDays(newBookingData.date, 3), 'yyyy-MM-dd')} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input placeholder="Enter customer name" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit">Confirm Booking</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgencyAdminCalendar;
