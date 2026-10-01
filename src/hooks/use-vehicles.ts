import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Vehicle {
  id: string;
  agency_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string | null;
  vin: string | null;
  status: 'available' | 'rented' | 'maintenance';
  photo_url: string | null;
  daily_rate_base: number | null;
  vehicle_class?: string | null;
  serial_number?: string | null;
  home_city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  current_location?: string | null;
  created_at: string;
}

const computeEffectiveState = (v: any) => {
  let effectiveStatus = v.status;
  let effectiveLocation = v.home_city || 'Unknown Location';

  const now = new Date();
  if (v.bookings && Array.isArray(v.bookings)) {
    const activeBooking = v.bookings.find((b: any) => {
      if (b.status !== 'confirmed' && b.status !== 'in_progress') return false;
      const start = new Date(b.pickup_date);
      const end = new Date(b.return_date);
      return now >= start && now <= end;
    });

    if (activeBooking) {
      effectiveStatus = 'rented';
      effectiveLocation = activeBooking.pickup_location || effectiveLocation;
    }
  }

  return {
    ...v,
    status: effectiveStatus,
    current_location: effectiveLocation,
  };
};

export const useAgencyVehicles = (agencyId: string | undefined) => {
  return useQuery({
    queryKey: ['vehicles', agencyId],
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, vehicle_agency_assignments!inner(agency_id), bookings(status, pickup_date, return_date, pickup_location)')
        .eq('vehicle_agency_assignments.agency_id', agencyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(computeEffectiveState) as Vehicle[];
    },
    enabled: !!agencyId,
  });
};

export interface VehicleWithAgency extends Vehicle {
  agency_name: string;
  agency_slug: string;
}

export const useAllVehicles = () => {
  return useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: async (): Promise<VehicleWithAgency[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, agencies!vehicles_agency_id_fkey!inner(name, slug), bookings(status, pickup_date, return_date, pickup_location)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        ...computeEffectiveState(v),
        agency_name: v.agencies?.name ?? '',
        agency_slug: v.agencies?.slug ?? '',
      })) as VehicleWithAgency[];
    },
  });
};
