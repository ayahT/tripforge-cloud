import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAgencies } from '@/hooks/use-agencies';
import { useAllVehicles } from '@/hooks/use-vehicles';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VehicleVisibilityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: agencies = [], isLoading: loadingAgencies } = useAgencies();
  const { data: vehicles = [], isLoading: loadingVehicles } = useAllVehicles();
  
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchAssignments();
  }, [open, vehicles, agencies]);

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicle_agency_assignments').select('*');
    if (error) {
      toast.error('Failed to load visibility assignments');
      setLoading(false);
      return;
    }
    
    const acc: Record<string, Set<string>> = {};
    vehicles.forEach(v => acc[v.id] = new Set());
    
    data?.forEach(row => {
      if (!acc[row.vehicle_id]) acc[row.vehicle_id] = new Set();
      acc[row.vehicle_id].add(row.agency_id);
    });
    
    setAssignments(acc);
    setLoading(false);
  };

  const toggleAssignment = (vehicleId: string, agencyId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      const set = new Set(next[vehicleId] || []);
      if (set.has(agencyId)) {
        set.delete(agencyId);
      } else {
        set.add(agencyId);
      }
      next[vehicleId] = set;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First, get all current vehicles to prevent clearing everything if we only have a subset
      const vehicleIds = vehicles.map(v => v.id);
      
      // Delete existing assignments for the visible vehicles
      if (vehicleIds.length > 0) {
        const { error: delError } = await supabase
          .from('vehicle_agency_assignments')
          .delete()
          .in('vehicle_id', vehicleIds);
          
        if (delError) throw delError;
      }

      const inserts: { vehicle_id: string; agency_id: string }[] = [];
      for (const [vId, aSet] of Object.entries(assignments)) {
        for (const aId of Array.from(aSet)) {
          inserts.push({ vehicle_id: vId, agency_id: aId });
        }
      }

      if (inserts.length > 0) {
        const { error: insError } = await supabase.from('vehicle_agency_assignments').insert(inserts);
        if (insError) throw insError;
      }
      
      toast.success('Visibility assignments updated');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Failed to save assignments');
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vehicle Visibility Matrix</DialogTitle>
          <DialogDescription>
            Control which vehicles each agency can see in their dashboard.
          </DialogDescription>
        </DialogHeader>
        
        {loading || loadingAgencies || loadingVehicles ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-4 border rounded-xl overflow-x-auto relative">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <tr>
                  <th className="px-4 py-4 min-w-[200px] font-semibold">Vehicle</th>
                  {agencies.map(a => (
                    <th key={a.id} className="px-4 py-4 text-center font-semibold min-w-[120px]">{a.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={agencies.length + 1} className="text-center py-8 text-muted-foreground">
                      No vehicles found.
                    </td>
                  </tr>
                ) : (
                  vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          {v.photo_url ? (
                            <img src={v.photo_url} alt="" className="w-10 h-10 rounded-md object-cover bg-secondary" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <div className="text-[13px]">{v.brand} {v.model}</div>
                            <div className="text-[11px] text-muted-foreground font-normal">{v.year}</div>
                          </div>
                        </div>
                      </td>
                      {agencies.map(a => (
                        <td key={a.id} className="px-4 py-3 text-center">
                          <Checkbox 
                            checked={assignments[v.id]?.has(a.id) || false} 
                            onCheckedChange={() => toggleAssignment(v.id, a.id)}
                            className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="gradient-accent">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
