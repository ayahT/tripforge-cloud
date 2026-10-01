import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  created_at: string;
}

export const useServices = () => {
  return useQuery({
    queryKey: ['platform-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
      if (error) {
        // Fallback for development if table doesn't exist
        console.warn('Could not fetch services, using fallback:', error);
        return [
          { id: '1', name: 'Car Rental', slug: 'car_rental', description: '', icon: 'Car', active: true, created_at: new Date().toISOString() },
          { id: '2', name: 'Apartment', slug: 'apartment', description: '', icon: 'Building', active: true, created_at: new Date().toISOString() },
          { id: '3', name: 'Transfer', slug: 'transfer', description: '', icon: 'ArrowRightLeft', active: true, created_at: new Date().toISOString() },
          { id: '4', name: 'Limo Service', slug: 'limo_tour', description: '', icon: 'Star', active: true, created_at: new Date().toISOString() },
          { id: '5', name: 'City Tour', slug: 'city_tour', description: '', icon: 'Map', active: true, created_at: new Date().toISOString() }
        ] as Service[];
      }
      return (data as Service[]) || [];
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: Partial<Service>) => {
      const { data, error } = await supabase.from('services').insert([service]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-services'] });
      toast.success('Service created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create service: ' + error.message);
    }
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: Partial<Service> & { id: string }) => {
      const { id, ...updates } = service;
      const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-services'] });
      toast.success('Service updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update service: ' + error.message);
    }
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-services'] });
      toast.success('Service deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete service: ' + error.message);
    }
  });
};
