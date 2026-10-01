import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Agency, StorefrontPage, PAGE_LABELS, PageSeo, PageSeoEntry, StorefrontTemplate, StorefrontConfig } from '@/types/agency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateAgency } from '@/hooks/use-agency-mutations';
import { useAgencyImageUpload } from '@/hooks/use-agency-image-upload';
import { Upload, Image, Check, Loader2 } from 'lucide-react';
import TemplatePicker from '@/components/agency-admin/TemplatePicker';
import StorefrontConfigEditor from '@/components/agency-admin/StorefrontConfigEditor';
import PageContentEditor from '@/components/agency-admin/PageContentEditor';
import { COUNTRY_LIST } from '@/lib/country-utils';
import { getCitiesForCountry } from '@/data/city-database';
import { getTemplateStyles } from '@/lib/template-styles';

const seoPages: StorefrontPage[] = ['home', 'fleet', 'contact', 'about'];
const DEFAULT_TRANSFER_DISTANCE_TIERS = [
  { from_km: 0, to_km: 50, multiplier: 1.0 },
  { from_km: 50, to_km: 100, multiplier: 0.9 },
  { from_km: 100, to_km: 200, multiplier: 0.8 },
  { from_km: 200, to_km: 300, multiplier: 0.75 },
  { from_km: 300, to_km: 500, multiplier: 0.7 },
];

const emptyPageSeo = (): PageSeoEntry => ({ meta_title: '', meta_description: '', og_image: '' });


const OgImageUpload = ({ currentUrl, agencyId, agencySlug, onUploaded }: { currentUrl: string; agencyId: string; agencySlug: string; onUploaded: (url: string) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading } = useAgencyImageUpload();

  const handleFile = async (file: File) => {
    const url = await uploadImage(agencyId, agencySlug, file, 'og');
    if (url) onUploaded(url);
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        className="relative group cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-accent h-32 flex items-center justify-center bg-secondary/20 transition-colors overflow-hidden"
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="OG preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          </>
        ) : (
          <div className="text-center">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">Click to upload OG image</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {uploading && <p className="text-xs text-accent animate-pulse">Uploading...</p>}
      <p className="text-[10px] text-muted-foreground">Recommended: 1200×630px for social media previews</p>
    </div>
  );
};

const AgencyAdminSettings = () => {
  const { agency } = useOutletContext<{ agency: Agency }>();
  const updateAgency = useUpdateAgency();
  const { uploadImage, uploading } = useAgencyImageUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(agency.logo_url);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(agency.favicon_url);

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
    const url = await uploadImage(agency.id, agency.slug, file, type);
    if (url) {
      if (type === 'logo') setLogoPreview(url);
      else setFaviconPreview(url);
    }
  };
  const [selectedTemplate, setSelectedTemplate] = useState<StorefrontTemplate>(agency.storefront_template ?? 'classic');
  const [buttonColor, setButtonColor] = useState(
    agency.button_color ?? getTemplateStyles(agency.storefront_template ?? 'classic').palette.cta
  );
  const [bgColor, setBgColor] = useState(agency.background_color ?? '#ffffff');
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(agency.storefront_config ?? {});
  
  const [commissionRate, setCommissionRate] = useState(agency.commission_rate ?? 10);
  const [oneWayFee, setOneWayFee] = useState(agency.one_way_fee ?? 0);

  const [form, setForm] = useState({
    name: agency.name,
    contact_email: agency.contact_email,
    city: agency.city,
    country: agency.country,
    domain: agency.domain ?? '',
    services: agency.services as string[],
  });


  const [pageSeo, setPageSeo] = useState<Record<StorefrontPage, PageSeoEntry>>(() => {
    const existing = agency.page_seo ?? {};
    return {
      home: { meta_title: existing.home?.meta_title ?? agency.meta_title ?? '', meta_description: existing.home?.meta_description ?? agency.meta_description ?? '', og_image: existing.home?.og_image ?? agency.og_image ?? '' },
      fleet: { ...emptyPageSeo(), ...existing.fleet },
      contact: { ...emptyPageSeo(), ...existing.contact },
      about: { ...emptyPageSeo(), ...existing.about },
    };
  });

  const toggleService = (service: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(service)
        ? f.services.filter((s) => s !== service)
        : [...f.services, service],
    }));
  };

  const updatePageSeo = (page: StorefrontPage, field: keyof PageSeoEntry, value: string) => {
    setPageSeo((prev) => ({ ...prev, [page]: { ...prev[page], [field]: value } }));
  };

  const handleSave = async () => {
    const cleanedPageSeo: PageSeo = {};
    for (const page of seoPages) {
      const entry = pageSeo[page];
      if (entry.meta_title || entry.meta_description || entry.og_image) {
        cleanedPageSeo[page] = {
          ...(entry.meta_title && { meta_title: entry.meta_title }),
          ...(entry.meta_description && { meta_description: entry.meta_description }),
          ...(entry.og_image && { og_image: entry.og_image }),
        };
      }
    }

    const normalizedStorefrontConfig: StorefrontConfig =
      form.services.includes('transfer') && !storefrontConfig.transfer_distance_tiers?.length
        ? { ...storefrontConfig, transfer_distance_tiers: DEFAULT_TRANSFER_DISTANCE_TIERS }
        : storefrontConfig;

    if (normalizedStorefrontConfig !== storefrontConfig) {
      setStorefrontConfig(normalizedStorefrontConfig);
    }

    await updateAgency.mutateAsync({
      id: agency.id,
      name: form.name,
      slug: agency.slug,
      status: agency.status,
      contact_email: form.contact_email,
      city: form.city,
      country: form.country,
      services: form.services,
      domain: form.domain || undefined,
      meta_title: pageSeo.home.meta_title || undefined,
      meta_description: pageSeo.home.meta_description || undefined,
      og_image: pageSeo.home.og_image || undefined,
      page_seo: Object.keys(cleanedPageSeo).length > 0 ? cleanedPageSeo : undefined,
      storefront_template: selectedTemplate,
      button_color: buttonColor,
      background_color: bgColor,
      storefront_config: normalizedStorefrontConfig,
      commission_rate: commissionRate,
      one_way_fee: oneWayFee,
    });
  };

  // Auto-save: debounce changes and persist automatically
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    pageSeo,
    selectedTemplate,
    buttonColor,
    bgColor,
    storefrontConfig,
    commissionRate,
    oneWayFee,
  ]);

  return (
    <div className="space-y-8 max-w-[800px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.2em] mb-1">Configuration</p>
            <h1 className="text-[30px] font-display font-bold text-foreground leading-tight">Settings</h1>
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

      {/* Storefront Template */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-premium rounded-xl p-7 space-y-6"
      >
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Storefront Template</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose a design template for your public website</p>
        </div>
        <TemplatePicker
          value={selectedTemplate}
          onChange={(tpl) => {
            setSelectedTemplate(tpl);
            // Sync the button color to the new template's CTA so each theme
            // gets its own coherent color by default.
            setButtonColor(getTemplateStyles(tpl).palette.cta);
          }}
        />

        {/* Color Customization */}
        <div className="pt-4 border-t border-border space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Custom Colors</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  placeholder="#c8a951"
                  className="font-mono text-xs flex-1"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Applied to all CTA buttons on your storefront</p>
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#ffffff"
                  className="font-mono text-xs flex-1"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Main background color of your storefront pages</p>
            </div>
          </div>
          {/* Live preview strip */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <div className="h-8 flex-1 rounded" style={{ backgroundColor: bgColor }} />
            <button className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: buttonColor }}>
              Book Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Storefront Content Config */}
      <StorefrontConfigEditor
        config={storefrontConfig}
        onChange={setStorefrontConfig}
        agencyName={agency.name}
      />

      {/* Page Content Editor */}
      <PageContentEditor
        config={storefrontConfig}
        onChange={setStorefrontConfig}
        agencyId={agency.id}
        agencySlug={agency.slug}
        agencyName={agency.name}
        enabledServices={form.services}
      />

      {/* Branding — Logo & Favicon */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-premium rounded-xl p-7 space-y-6"
      >
        <h2 className="text-lg font-display font-bold text-foreground">Branding</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" /> Logo</Label>
            <div
              onClick={() => logoInputRef.current?.click()}
              className="relative group cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-accent h-32 flex items-center justify-center bg-secondary/20 transition-colors overflow-hidden"
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Agency logo" className="h-full w-full object-contain p-3" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">Click to upload logo</p>
                </div>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo'); }} />
            <p className="text-[10px] text-muted-foreground">Recommended: 400×400px, PNG or SVG</p>
          </div>

          {/* Favicon */}
          <div className="space-y-3">
            <Label>Favicon</Label>
            <div
              onClick={() => faviconInputRef.current?.click()}
              className="relative group cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-accent h-32 flex items-center justify-center bg-secondary/20 transition-colors overflow-hidden"
            >
              {faviconPreview ? (
                <>
                  <img src={faviconPreview} alt="Favicon" className="h-16 w-16 object-contain" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">Click to upload favicon</p>
                </div>
              )}
            </div>
            <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'favicon'); }} />
            <p className="text-[10px] text-muted-foreground">Recommended: 32×32px, PNG or ICO</p>
          </div>
        </div>
        {uploading && <p className="text-xs text-accent animate-pulse">Uploading...</p>}
      </motion.div>

      {/* General Info */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-premium rounded-xl p-7 space-y-6"
      >
        <h2 className="text-lg font-display font-bold text-foreground">General Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agency Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input id="email" type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, city: '' }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a country</option>
              {COUNTRY_LIST.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <select
              id="city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              disabled={!form.country}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <option value="">{form.country ? 'Select a city' : 'Choose country first'}</option>
              {getCitiesForCountry(form.country).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain">Custom Domain</Label>
          <Input id="domain" value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="www.your-agency.com" />
        </div>

      </motion.div>

      {/* Per-Page SEO Settings */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-premium rounded-xl p-7 space-y-6"
      >
        <h2 className="text-lg font-display font-bold text-foreground">SEO & Meta Tags</h2>
        <p className="text-sm text-muted-foreground -mt-3">
          Configure SEO settings individually for each storefront page.
        </p>

        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {seoPages.map((page) => (
              <TabsTrigger key={page} value={page} className="text-xs">
                {PAGE_LABELS[page]}
              </TabsTrigger>
            ))}
          </TabsList>

          {seoPages.map((page) => (
            <TabsContent key={page} value={page} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor={`${page}-title`}>
                  Meta Title <span className="text-muted-foreground font-normal">(max 60 chars)</span>
                </Label>
                <Input
                  id={`${page}-title`}
                  value={pageSeo[page].meta_title ?? ''}
                  onChange={(e) => updatePageSeo(page, 'meta_title', e.target.value)}
                  maxLength={60}
                  placeholder={`e.g. ${PAGE_LABELS[page]} | ${agency.name}`}
                />
                <p className="text-[10px] text-muted-foreground">{(pageSeo[page].meta_title ?? '').length}/60</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${page}-desc`}>
                  Meta Description <span className="text-muted-foreground font-normal">(max 160 chars)</span>
                </Label>
                <Input
                  id={`${page}-desc`}
                  value={pageSeo[page].meta_description ?? ''}
                  onChange={(e) => updatePageSeo(page, 'meta_description', e.target.value)}
                  maxLength={160}
                  placeholder={`Describe the ${PAGE_LABELS[page].toLowerCase()} page for search engines...`}
                />
                <p className="text-[10px] text-muted-foreground">{(pageSeo[page].meta_description ?? '').length}/160</p>
              </div>
              <div className="space-y-2">
                <Label>OG Image</Label>
                <OgImageUpload
                  currentUrl={pageSeo[page].og_image ?? ''}
                  agencyId={agency.id}
                  agencySlug={agency.slug}
                  onUploaded={(url) => updatePageSeo(page, 'og_image', url)}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* Marketplace Commission */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-premium rounded-xl p-7 space-y-4"
      >
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Marketplace Commission</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your storefront shows vehicles from all agencies. Set a commission percentage added to partner vehicles' prices.
          </p>
        </div>
        <div className="space-y-3">
          <Label>Commission Rate (%)</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={0}
              max={50}
              step={1}
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-28 font-mono"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Example: A partner vehicle at $100/day shows as <strong>${Math.round(100 * (1 + commissionRate / 100))}/day</strong> on your storefront.
          </p>
        </div>
        <div className="space-y-3">
          <Label>One-Way Drop-off Fee (€)</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={0}
              max={500}
              step={5}
              value={oneWayFee}
              onChange={(e) => setOneWayFee(Number(e.target.value))}
              className="w-28 font-mono"
            />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Charged when customers return the vehicle to a different location.
          </p>
        </div>
      </motion.div>

    </div>
  );
};

export default AgencyAdminSettings;
