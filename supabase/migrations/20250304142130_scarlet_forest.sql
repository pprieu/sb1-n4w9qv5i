/*
  # Mise à jour de la table des parties

  1. Modifications
    - Ajout de la colonne `notes` (text, nullable) pour les commentaires sur la partie
    - Ajout de colonnes pour les données météo:
      - `weather_data` (jsonb, nullable) pour stocker les informations météo
  
  2. Sécurité
    - Mise à jour des politiques existantes pour inclure les nouveaux champs
*/

-- Ajout de la colonne notes
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS notes text;

-- Ajout de la colonne weather_data
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS weather_data jsonb;

-- Création d'un index GIN pour la recherche dans les notes
CREATE INDEX IF NOT EXISTS idx_rounds_notes ON rounds USING gin(to_tsvector('french', notes));

-- Création d'un index GIN pour la recherche dans les données météo
CREATE INDEX IF NOT EXISTS idx_rounds_weather_data ON rounds USING gin(weather_data);

-- Mise à jour des politiques existantes n'est pas nécessaire car elles sont basées sur user_id
-- et s'appliquent déjà à tous les champs de la table