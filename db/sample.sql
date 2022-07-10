-- Adds dummy data into the database for testing
WITH 
account_sample (account_name) as ( VALUES
  ('Meadow Crystalfreak'),
  ('Buddy-Ray Perceptor'),
  ('Prince Flitterbell')
),
post_sample (post_description) as (VALUES
  ('first'),
  ('loooooooooooooooooooooooooooooooooooong text looooooooong text long text'),
  ('SPECIAL CHARACTERS!@#$%^&*()_+-={}[]:"<>,.?/')
),
inserted_account as (
  INSERT INTO account(account_name) (SELECT account_name FROM account_sample)
  RETURNING account_id
),
owned_post_sample as (
  SELECT account_id, post_description FROM (
    (SELECT row_number() over(), account_id FROM inserted_account) AS a INNER JOIN
    (SELECT row_number() over(), post_description FROM post_sample) AS b on
    a.row_number = b.row_number
  )
)
INSERT INTO post(post_owner_id, post_description) 
(SELECT account_id, post_description FROM owned_post_sample);