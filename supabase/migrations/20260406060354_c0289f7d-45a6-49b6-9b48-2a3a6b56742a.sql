-- Add receipt_url column to fee_payments
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_url text;

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to receipts
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');
