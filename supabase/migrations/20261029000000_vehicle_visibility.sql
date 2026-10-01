CREATE TABLE IF NOT EXISTS public.vehicle_agency_assignments (
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    PRIMARY KEY (vehicle_id, agency_id)
);

ALTER TABLE public.vehicle_agency_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage vehicle_agency_assignments"
ON public.vehicle_agency_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency members can view their vehicle_agency_assignments"
ON public.vehicle_agency_assignments
FOR SELECT
USING (
    agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
);

-- Backfill assignments for existing vehicles based on their primary agency_id
INSERT INTO public.vehicle_agency_assignments (vehicle_id, agency_id)
SELECT id, agency_id FROM public.vehicles WHERE agency_id IS NOT NULL
ON CONFLICT DO NOTHING;
