CREATE TABLE public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Super admin can manage services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.services (name, slug, icon) VALUES 
('Car Rental', 'car_rental', 'Car'),
('Apartment', 'apartment', 'Building'),
('Transfer', 'transfer', 'ArrowRightLeft'),
('Limo Service', 'limo_tour', 'Star'),
('City Tour', 'city_tour', 'Map');
