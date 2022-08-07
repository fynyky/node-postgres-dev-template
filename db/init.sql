-- Initializes the app data models in the database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE account (
  account_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name text,
  account_password_hash text, -- Salt stored together with hash
  account_created_at timestamp default current_timestamp
);

CREATE TABLE post (
  post_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), 
  post_owner_id uuid REFERENCES account(account_id),
  post_description text,
  post_image_key text,
  post_created_at timestamp default current_timestamp
);