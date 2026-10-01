import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Agency, SERVICE_LABELS, ServiceType, StorefrontConfig } from '@/types/agency';
import { useUpdateAgency } from '@/hooks/use-agency-mutations';
import { Check, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ServicePricingEditor from '@/components/agency-admin/ServicePricingEditor';

const serviceOptions: ServiceType[] = ['car_rental', 'apartment', 'transfer', 'limo_tour', 'city_tour'];

const DEFAULT_TRANSFER_DISTANCE_TIERS = [
  { from_km: 0, to_km: 50, multiplier: 1.0 },
  { from_km: 50, to_km: 100, multiplier: 0.9 },
  { from_km: 100, to_km: 200, multiplier: 0.8 },
  { from_km: 200, to_km: 300, multiplier: 0.75 },
  { from_km: 300, to_km: 500, multiplier: 0.7 },
];

const AgencyAdminServicesPricing = () => {
  const { agency } = useOutletContext<{ agency: Agency }>();
  const updateAgency = useUpdateAgency();

  const [services, setServices] = useState<string[]>(agency.services || []);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(agency.storefront_config ?? {});

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSave = async () => {
    const normalizedStorefrontConfig: StorefrontConfig =
      services.includes('transfer') && !storefrontConfig.transfer_distance_tiers?.length
        ? { ...storefrontConfig, transfer_distance_tiers: DEFAULT_TRANSFER_DISTANCE_TIERS }
        : storefrontConfig;

    if (normalizedStorefrontConfig !== storefrontConfig) {
      setStorefrontConfig(normalizedStorefrontConfig);
    }

    await updateAgency.mutateAsync({
      id: agency.id,
      services,
      storefront_config: normalizedStorefrontConfig,
    });
  };

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      handleSave().catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [services, storefrontConfig]);

  return (
    <div className="space-y-8 max-w-[800px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.2em] mb-1">Configuration</p>
            <h1 className="text-[30px] font-display font-bold text-foreground leading-tight">Services & Pricing</h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-light">
              Changes are saved automatically
            </p>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
            {updateAgency.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Check className="h-3.5 w-3.5 text-accent" /> Saved</>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-premium rounded-xl p-7 space-y-6"
      >
        <div className="space-y-3">
          <Label>Active Services</Label>
          <div className="grid grid-cols-2 gap-3">
            {serviceOptions.map((service) => (
              <label key={service} className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors">
                <Checkbox checked={services.includes(service)} onCheckedChange={() => toggleService(service)} />
                <span className="text-sm text-foreground">{SERVICE_LABELS[service]}</span>
              </label>
            ))}
          </div>
        </div>

        <ServicePricingEditor 
          agencyId={agency.id} 
          enabledServices={services} 
          storefrontConfig={storefrontConfig} 
          onConfigChange={setStorefrontConfig} 
          country={agency.country || ''} 
        />
      </motion.div>
    </div>
  );
};

export default AgencyAdminServicesPricing;
