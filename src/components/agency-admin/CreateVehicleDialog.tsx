import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useCreateVehicle, useUploadVehiclePhoto } from '@/hooks/use-vehicle-mutations';

interface Props {
  agencyId: string;
}

const CreateVehicleDialog = ({ agencyId }: Props) => {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [status, setStatus] = useState<string>('available');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [transmission, setTransmission] = useState('manual');
  const [seats, setSeats] = useState('5');
  const [fuelType, setFuelType] = useState('gasoline');
  const [category, setCategory] = useState('sedan');
  const [vehicleClass, setVehicleClass] = useState('economy');
  const [airConditioning, setAirConditioning] = useState(true);
  const [mileagePolicy, setMileagePolicy] = useState('unlimited');
  const [homeCity, setHomeCity] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const createVehicle = useCreateVehicle();
  const uploadPhoto = useUploadVehiclePhoto();

  const reset = () => {
    setBrand(''); setModel(''); setYear(new Date().getFullYear().toString());
    setPlate(''); setVin(''); setStatus('available'); setPhotoFile(null);
    setTransmission('manual'); setSeats('5'); setFuelType('gasoline');
    setCategory('sedan'); setAirConditioning(true); setMileagePolicy('unlimited');
    setVehicleClass('economy');
    setHomeCity(''); setHomeCountry('');
    setStartDate(''); setEndDate('');
  };

  const handleSubmit = async () => {
    if (!brand.trim() || !model.trim() || !homeCity.trim() || !homeCountry.trim()) return;

    let photo_url: string | undefined;
    if (photoFile) {
      photo_url = await uploadPhoto.mutateAsync({ file: photoFile, agencyId });
    }

    await createVehicle.mutateAsync({
      agency_id: agencyId,
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      license_plate: plate.trim() || undefined,
      vin: vin.trim() || undefined,
      status,
      photo_url,
      transmission,
      seats: parseInt(seats),
      fuel_type: fuelType,
      category,
      air_conditioning: airConditioning,
      mileage_policy: mileagePolicy,
      vehicle_class: vehicleClass,
      home_city: homeCity.trim() || undefined,
      home_country: homeCountry.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });

    reset();
    setOpen(false);
  };

  const isPending = createVehicle.isPending || uploadPhoto.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>Add a vehicle to your fleet.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand *</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Mercedes" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model *</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="S-Class" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="hatchback">Hatchback</SelectItem>
                  <SelectItem value="coupe">Coupe</SelectItem>
                  <SelectItem value="convertible">Convertible</SelectItem>
                  <SelectItem value="minivan">Minivan</SelectItem>
                  <SelectItem value="pickup">Pickup Truck</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={vehicleClass} onValueChange={setVehicleClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first_class">First Class</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Type</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="seats">Seats</Label>
              <Input id="seats" type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mileage Policy</Label>
              <Select value={mileagePolicy} onValueChange={setMileagePolicy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={airConditioning} onCheckedChange={setAirConditioning} />
              <Label>Air Conditioning</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate">License Plate</Label>
              <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AB-123-CD" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vin">VIN</Label>
              <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="WDB1234567890" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="homeCity">Location (City) *</Label>
              <Input id="homeCity" value={homeCity} onChange={(e) => setHomeCity(e.target.value)} placeholder="Istanbul" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="homeCountry">Location (Country) *</Label>
              <Input id="homeCountry" value={homeCountry} onChange={(e) => setHomeCountry(e.target.value)} placeholder="Turkey" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Used to calculate drop-off fees based on distance from the vehicle's home location.</p>

          <div className="space-y-1.5">
            <Label>Photo</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-4 hover:border-accent/40 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {photoFile ? photoFile.name : 'Click to upload a photo'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !brand.trim() || !model.trim() || !homeCity.trim() || !homeCountry.trim()}>
            {isPending ? 'Adding...' : 'Add Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateVehicleDialog;
