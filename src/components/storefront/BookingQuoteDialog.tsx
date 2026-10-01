import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, Shield, Navigation, Baby, UserPlus, Wifi, Snowflake, Package, Info, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { INSURANCE_TIERS, BOOKING_EXTRAS, calculateQuote, InsuranceTier, BookingExtra } from '@/types/booking';
import { MarketplaceVehicle } from '@/hooks/use-marketplace-vehicles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import LocationAutocomplete, { getAgencyLocations } from '@/components/storefront/LocationAutocomplete';

const EXTRA_ICONS: Record<string, React.ElementType> = {
  Navigation, Baby, UserPlus, Wifi, Snowflake, Package,
};

interface Props {
  vehicle: MarketplaceVehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buttonColor: string;
  numDays: number;
  isOneWay: boolean;
  oneWayFee: number;
  pickupCity?: string;
}

const BookingQuoteDialog = ({ vehicle, open, onOpenChange, buttonColor, numDays: initialDays, isOneWay, oneWayFee, pickupCity }: Props) => {
  const [numDays, setNumDays] = useState(Math.max(1, initialDays));
  const [estimatedKm, setEstimatedKm] = useState(100);
  const [crossCityDistance, setCrossCityDistance] = useState(0);
  const [selectedInsurance, setSelectedInsurance] = useState<string>('basic');
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'quote' | 'details' | 'success'>('quote');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [customer, setCustomer] = useState({
    name: '', email: '', phone: '',
    pickup_date: today,
    return_date: new Date(Date.now() + (Math.max(1, initialDays)) * 86400000).toISOString().slice(0, 10),
    pickup_location: pickupCity ?? '',
    return_location: pickupCity ?? '',
    notes: '',
  });

  const insurance = INSURANCE_TIERS.find(t => t.id === selectedInsurance) ?? INSURANCE_TIERS[0];
  const extrasDailyTotal = Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
    const extra = BOOKING_EXTRAS.find(e => e.id === id);
    return sum + (extra ? extra.price_per_day * qty : 0);
  }, 0);

  const dailyRate = vehicle.daily_rate ?? 0;
  const pricePerKm = 0;
  const freeKmPerDay = 200;

  // Cross-city drop-off: if vehicle has a home city and pickup is in a different city,
  // charge either a fixed drop_off_fee or distance × price_per_km.
  const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
  const isCrossCity = !!vehicle.home_city && !!pickupCity && norm(vehicle.home_city) !== norm(pickupCity);
  const dropOffFee = 0;

  const effectiveOneWayFee = isCrossCity ? dropOffFee : oneWayFee;
  const effectiveIsOneWay = isCrossCity ? true : isOneWay;

  const quote = useMemo(() => calculateQuote({
    daily_rate: dailyRate,
    price_per_km: pricePerKm,
    free_km_per_day: freeKmPerDay,
    num_days: numDays,
    estimated_km: estimatedKm,
    is_one_way: effectiveIsOneWay,
    one_way_fee: effectiveOneWayFee,
    insurance_daily: insurance.daily_price,
    extras_daily: extrasDailyTotal,
    commission_rate: vehicle.commission_rate,
    is_external: !vehicle.is_own,
  }), [dailyRate, pricePerKm, freeKmPerDay, numDays, estimatedKm, effectiveIsOneWay, effectiveOneWayFee, insurance, extrasDailyTotal, vehicle]);

  const toggleExtra = (extra: BookingExtra) => {
    setSelectedExtras(prev => {
      const current = prev[extra.id] ?? 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[extra.id];
        return next;
      }
      return { ...prev, [extra.id]: 1 };
    });
  };

  const customerSchema = z.object({
    name: z.string().trim().min(2, 'Full name is required').max(120),
    email: z.string().trim().email('Valid email required').max(255),
    phone: z.string().trim().min(5, 'Phone required').max(40),
    pickup_date: z.string().min(1, 'Pickup date required'),
    return_date: z.string().min(1, 'Return date required'),
    pickup_location: z.string().trim().max(200).optional().or(z.literal('')),
    return_location: z.string().trim().max(200).optional().or(z.literal('')),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  }).refine(d => new Date(d.return_date) >= new Date(d.pickup_date), {
    message: 'Return date must be on or after pickup', path: ['return_date'],
  });

  const submitBooking = async () => {
    const parsed = customerSchema.safeParse(customer);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please complete all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const serviceType = vehicle.is_own ? 'car_rental' : 'car_rental';
      const noteParts = [
        `Vehicle: ${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
        `Days: ${numDays} • Est. km: ${estimatedKm}`,
        `Insurance: ${insurance.name}`,
        Object.keys(selectedExtras).length
          ? `Extras: ${Object.entries(selectedExtras).map(([id, q]) => {
              const e = BOOKING_EXTRAS.find(x => x.id === id); return e ? `${e.name}×${q}` : id;
            }).join(', ')}`
          : null,
        !vehicle.is_own ? `Marketplace via ${vehicle.agency_name}` : null,
        customer.notes ? `Customer note: ${customer.notes}` : null,
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          agency_id: vehicle.agency_id,
          vehicle_id: vehicle.id,
          customer_name: parsed.data.name,
          customer_email: parsed.data.email,
          customer_phone: parsed.data.phone,
          pickup_date: new Date(parsed.data.pickup_date).toISOString(),
          return_date: new Date(parsed.data.return_date).toISOString(),
          pickup_location: parsed.data.pickup_location || null,
          return_location: parsed.data.return_location || null,
          service_type: serviceType,
          status: 'pending',
          amount: quote.total,
          notes: noteParts,
        })
        .select('id')
        .single();

      if (error) throw error;
      setConfirmation(data?.id ?? null);
      setStep('success');
      toast.success('Booking request received');

      // Fire-and-forget customer confirmation email (don't block on failure)
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            customer_name: parsed.data.name,
            customer_email: parsed.data.email,
            reference: (data?.id ?? '').slice(0, 8).toUpperCase(),
            agency_name: vehicle.agency_name,
            vehicle: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
            pickup_date: new Date(parsed.data.pickup_date).toISOString(),
            return_date: new Date(parsed.data.return_date).toISOString(),
            pickup_location: parsed.data.pickup_location || undefined,
            return_location: parsed.data.return_location || undefined,
            amount: quote.total,
            currency: 'EUR',
            service_type: 'Car Rental',
            notes: noteParts,
          },
        });
      } catch (mailErr) {
        console.warn('Booking confirmation email failed', mailErr);
      }
    } catch (err: any) {
      console.error('Booking error', err);
      toast.error(err?.message || 'Could not submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // reset on close
      setTimeout(() => {
        setStep('quote');
        setConfirmation(null);
      }, 200);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {vehicle.brand} {vehicle.model} <span className="text-muted-foreground font-normal text-base">({vehicle.year})</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'success' ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${buttonColor}20` }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: buttonColor }} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Booking request received</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Thank you, {customer.name.split(' ')[0]}. {vehicle.agency_name} will contact you at <strong>{customer.email}</strong> shortly to confirm.
              </p>
              {confirmation && (
                <p className="text-xs text-muted-foreground mt-3">Reference: <span className="font-mono">{confirmation.slice(0, 8).toUpperCase()}</span></p>
              )}
            </div>
            <Button className="w-full h-11 rounded-xl font-bold text-white" style={{ backgroundColor: buttonColor }} onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : step === 'details' ? (
          <div className="space-y-5 mt-2">
            <button onClick={() => setStep('quote')} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to quote
            </button>
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Your details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Full name *</Label>
                  <Input value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" />
                </div>
                <div className="space-y-1.5">
                  <Label>Pickup date *</Label>
                  <Input type="date" min={today} value={customer.pickup_date} onChange={e => {
                    const newPick = e.target.value;
                    const pick = new Date(newPick);
                    if (!isNaN(pick.getTime())) {
                      const ret = new Date(pick.getTime() + numDays * 86400000);
                      setCustomer(c => ({ ...c, pickup_date: newPick, return_date: ret.toISOString().slice(0, 10) }));
                    } else {
                      setCustomer(c => ({ ...c, pickup_date: newPick }));
                    }
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Return date *</Label>
                  <Input type="date" min={customer.pickup_date} value={customer.return_date} onChange={e => {
                    const newRet = e.target.value;
                    const pick = new Date(customer.pickup_date);
                    const ret = new Date(newRet);
                    if (!isNaN(pick.getTime()) && !isNaN(ret.getTime())) {
                      const days = Math.max(1, Math.round((ret.getTime() - pick.getTime()) / 86400000));
                      setNumDays(days);
                    }
                    setCustomer(c => ({ ...c, return_date: newRet }));
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Pickup location</Label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <LocationAutocomplete
                      value={customer.pickup_location}
                      onChange={(val) => setCustomer(c => ({ ...c, pickup_location: val }))}
                      placeholder="Airport, hotel, address..."
                      locations={vehicle.home_city ? getAgencyLocations(vehicle.home_city, vehicle.home_country || '') : []}
                      agencyCity={vehicle.home_city ?? ''}
                      agencyCountry={vehicle.home_country ?? ''}
                      accentColor={buttonColor}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Return location</Label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <LocationAutocomplete
                      value={customer.return_location}
                      onChange={(val) => setCustomer(c => ({ ...c, return_location: val }))}
                      placeholder="Same as pickup"
                      locations={vehicle.home_city ? getAgencyLocations(vehicle.home_city, vehicle.home_country || '') : []}
                      agencyCity={vehicle.home_city ?? ''}
                      agencyCountry={vehicle.home_country ?? ''}
                      accentColor={buttonColor}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes (optional)</Label>
                  <Input value={customer.notes} onChange={e => setCustomer(c => ({ ...c, notes: e.target.value }))} placeholder="Flight number, special requests…" maxLength={500} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 text-sm flex justify-between items-center">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-bold text-lg" style={{ color: buttonColor }}>{quote.total.toFixed(2)} €</span>
            </div>

            <Button
              className="w-full h-12 rounded-xl font-bold text-white"
              style={{ backgroundColor: buttonColor }}
              disabled={submitting}
              onClick={submitBooking}
            >
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>) : 'Confirm booking request'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              No payment required now. The agency will contact you to confirm and arrange payment.
            </p>
          </div>
        ) : (
        <div className="space-y-6 mt-2">
          {/* Trip Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Trip Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rental days</Label>
                <Input type="number" min={1} max={365} value={numDays} onChange={e => {
                  const d = Math.max(1, parseInt(e.target.value) || 1);
                  setNumDays(d);
                  const pick = new Date(customer.pickup_date);
                  if (!isNaN(pick.getTime())) {
                    setCustomer(c => ({ ...c, return_date: new Date(pick.getTime() + d * 86400000).toISOString().slice(0, 10) }));
                  }
                }} />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated distance (km)</Label>
                <Input type="number" min={0} step={50} value={estimatedKm} onChange={e => setEstimatedKm(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> {freeKmPerDay} km/day included free • Extra km at {pricePerKm} €/km
            </p>
            {isCrossCity && (
              <div className="mt-3 p-3 rounded-md border border-border bg-muted/40 space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1">
                  <Info className="h-3 w-3" /> Cross-city pickup
                </p>
                <p className="text-xs text-muted-foreground">
                  This car is based in <strong>{vehicle.home_city}</strong> and your pickup is in <strong>{pickupCity}</strong>. Delivery fee will be confirmed by the agency.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Insurance */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" /> Insurance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INSURANCE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedInsurance(tier.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selectedInsurance === tier.id
                      ? 'shadow-md'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  style={selectedInsurance === tier.id ? { borderColor: buttonColor } : undefined}
                >
                  {selectedInsurance === tier.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: buttonColor }}>
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <p className="font-bold text-sm">{tier.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  <p className="font-bold mt-2" style={{ color: buttonColor }}>
                    {tier.daily_price === 0 ? 'Included' : `+${tier.daily_price} €/day`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {tier.coverage.slice(0, 3).map(c => (
                      <li key={c} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Check className="h-2.5 w-2.5 shrink-0" style={{ color: buttonColor }} /> {c}
                      </li>
                    ))}
                    {tier.coverage.length > 3 && (
                      <li className="text-[10px] text-muted-foreground">+{tier.coverage.length - 3} more</li>
                    )}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Extras */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Extras & Add-ons</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BOOKING_EXTRAS.map((extra) => {
                const Icon = EXTRA_ICONS[extra.icon] ?? Package;
                const isSelected = (selectedExtras[extra.id] ?? 0) > 0;
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                    }`}
                    style={isSelected ? { borderColor: buttonColor } : undefined}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 opacity-60" />
                      <span className="text-xs font-semibold">{extra.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{extra.description}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: buttonColor }}>+{extra.price_per_day} €/day</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Price Estimate</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base rental ({numDays} day{numDays > 1 ? 's' : ''} × {dailyRate} €)</span>
                <span className="font-medium">{quote.base_rental.toFixed(2)} €</span>
              </div>
              {quote.extra_km > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Extra mileage ({quote.extra_km} km × {pricePerKm} €)</span>
                  <span>{quote.km_charge.toFixed(2)} €</span>
                </div>
              )}
              {quote.one_way_fee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{isCrossCity ? `Cross-city delivery (${vehicle.home_city} → ${pickupCity})` : 'One-way drop-off fee'}</span>
                  <span>{quote.one_way_fee.toFixed(2)} €</span>
                </div>
              )}
              {quote.insurance_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{insurance.name} insurance ({numDays} days)</span>
                  <span>{quote.insurance_total.toFixed(2)} €</span>
                </div>
              )}
              {quote.extras_total > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Extras ({numDays} days)</span>
                  <span>{quote.extras_total.toFixed(2)} €</span>
                </div>
              )}
              {quote.commission > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Partner service fee</span>
                  <span>{quote.commission.toFixed(2)} €</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold pt-1">
                <span>Total</span>
                <span style={{ color: buttonColor }}>{quote.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-xl font-bold text-white"
            style={{ backgroundColor: buttonColor }}
            onClick={() => setStep('details')}
          >
            Proceed to Booking
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingQuoteDialog;
