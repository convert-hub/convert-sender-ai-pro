-- Resetar contador de disparos para o admin afetado pelo bug de webhook duplicado
UPDATE user_settings 
SET dispatches_today = 0
WHERE user_id = '6135493d-5758-44d6-bc75-542fc2020c21';