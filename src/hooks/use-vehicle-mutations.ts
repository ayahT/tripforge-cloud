import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateVehicleInput {
  agency_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate?: string;
  vin?: string;
  status?: string;
  photo_url?: string;
  transmission?: string;
  seats?: number;
  fuel_type?: string;
  category?: string;
  air_conditioning?: boolean;
  mileage_policy?: string;
  daily_rate_base?: number | null;
  vehicle_class?: string;
  home_city?: string;
  home_country?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export const useCreateVehicle = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      const { data, error } = await supabase.from('vehicles').insert(input as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['vehicles', variables.agency_id] });
      toast.success('Vehicle added successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
};

interface UpdateVehicleInput {
  id: string;
  agency_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string | null;
  vin: string | null;
  status: string;
  transmission?: string;
  seats?: number;
  fuel_type?: string;
  category?: string;
  air_conditioning?: boolean;
  mileage_policy?: string;
  daily_rate_base?: number | null;
  vehicle_class?: string;
  home_city?: string | null;
  home_country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export const useUpdateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agency_id, ...input }: UpdateVehicleInput) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['vehicles', variables.agency_id] });
      toast.success('Vehicle updated successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update vehicle: ${err.message}`);
    },
  });
};

export const useUploadVehiclePhoto = () => {
  return useMutation({
    mutationFn: async ({ file, agencyId }: { file: File; agencyId: string }) => {
      const ext = file.name.split('.').pop();
      const path = `${agencyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('vehicle-photos').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
      return urlData.publicUrl;
    },
    onError: (err: Error) => {
      toast.error('Photo upload failed: ' + err.message);
    },
  });
};
