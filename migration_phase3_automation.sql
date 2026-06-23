-- Add default_contract_template to studios table

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS default_contract_template text;
