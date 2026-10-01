import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Building, Car, Star, Map, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useServices, useCreateService, useUpdateService, useDeleteService, Service } from '@/hooks/use-services';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const ICON_MAP: Record<string, React.ElementType> = {
  Car: Car,
  Building: Building,
  Star: Star,
  Map: Map,
  ArrowRightLeft: ArrowRightLeft,
};

const ServicesPricing = () => {
  const [search, setSearch] = useState('');
  const { data: services = [], isLoading } = useServices();
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    slug: '',
    description: '',
    icon: 'Car',
    base_price: 0,
    active: true,
  });

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData(service);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'Car',
      base_price: 0,
      active: true,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editingService) {
      await updateMutation.mutateAsync({ ...formData, id: editingService.id });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Platform Services</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage global platform services and their configurations.
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2 rounded-xl h-10 px-4">
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Service</th>
                <th className="px-6 py-4 whitespace-nowrap">Slug</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto inline-block" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No services found.
                  </td>
                </tr>
              ) : (
                filtered.map((service) => {
                  const Icon = service.icon && ICON_MAP[service.icon] ? ICON_MAP[service.icon] : Car;
                  return (
                    <motion.tr
                      key={service.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{service.name}</p>
                            {service.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">{service.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{service.slug}</td>
                      <td className="px-6 py-4">
                        <Badge variant={service.active ? 'default' : 'secondary'} className={service.active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
                          {service.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(service)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(service.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Helicopter Ride"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (identifier)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\\s+/g, '_') })}
                placeholder="e.g. helicopter_ride"
                disabled={!!editingService}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Active Status</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingService ? 'Save Changes' : 'Create Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesPricing;
