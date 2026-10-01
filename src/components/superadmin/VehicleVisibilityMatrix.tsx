import { useState, useEffect } from 'react';
import { useAgencies } from '@/hooks/use-agencies';
import { useAllVehicles } from '@/hooks/use-vehicles';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Car } from 'lucide-react';
import { toast } from 'sonner';

export default function VehicleVisibilityMatrix() {
  const { data: agencies = [], isLoading: loadingAgencies } = useAgencies();
  const { data: vehicles = [], isLoading: loadingVehicles } = useAllVehicles();
  
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, [vehicles, agencies]);

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
    setHasChanges(false);
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
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const vehicleIds = vehicles.map(v => v.id);
      
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
      setHasChanges(false);
    } catch (e: any) {
      toast.error('Failed to save assignments');
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Vehicle ↔ Agency Assignment</h2>
          <p className="text-sm text-muted-foreground mt-1">Control which vehicles each agency can see.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading || !hasChanges} className="gradient-accent">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
      
      <div className="card-premium rounded-xl p-0 overflow-hidden">
        {loading || loadingAgencies || loadingVehicles ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="px-5 py-4 min-w-[250px] font-semibold">Vehicle</th>
                  {agencies.map(a => (
                    <th key={a.id} className="px-5 py-4 text-center font-semibold min-w-[120px]">{a.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={agencies.length + 1} className="text-center py-12 text-muted-foreground">
                      No vehicles found across agencies.
                    </td>
                  </tr>
                ) : (
                  vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium border-r border-border/50">
                        <div className="flex items-center gap-3">
                          {v.photo_url ? (
                            <img src={v.photo_url} alt="" className="w-10 h-10 rounded-md object-cover bg-secondary" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                              <Car className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <div className="text-[13px] font-semibold text-foreground">{v.brand} {v.model}</div>
                            <div className="text-[11px] text-muted-foreground font-normal">{v.year} · {v.agency_name}</div>
                          </div>
                        </div>
                      </td>
                      {agencies.map(a => (
                        <td key={a.id} className="px-5 py-3 text-center">
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
      </div>
    </div>
  );
}
