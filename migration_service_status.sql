-- Add status column to booking_services
ALTER TABLE booking_services 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add a helpful comment
COMMENT ON COLUMN booking_services.status IS 'Status of the individual service fulfillment (e.g. pending, in_progress, ready, delivered, cancelled)';
