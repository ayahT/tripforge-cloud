import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StorefrontVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  status: 'available' | 'rented' | 'maintenance';
  photo_url: string | null;
  daily_rate: number | null;
  daily_rate_base: number | null;
  transmission: string | null;
  seats: number | null;
  fuel_type: string | null;
  category: string | null;
  air_conditioning: boolean | null;
  mileage_policy: string | null;
}

export const useStorefrontVehicles = (agencyId: string | undefined) => {
  return useQuery({
    queryKey: ['storefront-vehicles', agencyId],
    queryFn: async (): Promise<StorefrontVehicle[]> => {
      const baseCols = 'id, brand, model, year, status, photo_url, transmission, seats, fuel_type, category, air_conditioning, mileage_policy';
      
      let res: any = await supabase
        .from('vehicles')
        .select(`${baseCols}, daily_rate_base`)
        .eq('agency_id', agencyId!)
        .order('created_at', { ascending: false });

      if (res.error?.code === '42703') {
        res = await supabase
          .from('vehicles')
          .select(baseCols)
          .eq('agency_id', agencyId!)
          .order('created_at', { ascending: false });
      }

      const vehicles = res.data;
      if (res.error) throw res.error;
      if (!vehicles?.length) return [];

      // Fetch current pricing for these vehicles
      const vehicleIds = vehicles.map((v: any) => v.id);
      const today = new Date().toISOString().split('T')[0];

      const { data: pricing } = await supabase
        .from('vehicle_pricing')
        .select('vehicle_id, daily_rate')
        .in('vehicle_id', vehicleIds)
        .lte('start_date', today)
        .gte('end_date', today);

      const priceMap: Record<string, number> = {};
      if (pricing) {
        for (const p of pricing as any[]) {
          if (!priceMap[p.vehicle_id]) {
            priceMap[p.vehicle_id] = p.daily_rate;
          }
        }
      }

      const missingIds = vehicleIds.filter((id: string) => !priceMap[id]);
      if (missingIds.length > 0) {
        const { data: fallback } = await supabase
          .from('vehicle_pricing')
          .select('vehicle_id, daily_rate')
          .in('vehicle_id', missingIds)
          .order('start_date', { ascending: true });

        if (fallback) {
          for (const p of fallback as any[]) {
            if (!priceMap[p.vehicle_id]) {
              priceMap[p.vehicle_id] = p.daily_rate;
            }
          }
        }
      }

      return (vehicles as any[]).map((v) => ({
        ...v,
        daily_rate: priceMap[v.id] ?? null,
      }));
    },
    enabled: !!agencyId,
  });
};
