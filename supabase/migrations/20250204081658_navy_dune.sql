/*
  # Version 1 du Golf Performance Tracker

  Cette migration marque la première version stable de l'application avec les fonctionnalités suivantes :
  
  1. Gestion des parcours
    - Liste des parcours par département
    - Ajout/modification des parcours
    - Système de favoris
  
  2. Gestion des parties
    - Saisie des scores trou par trou
    - Sauvegarde partielle (trou par trou)
    - Reprise des parties en cours
    - Historique des parties
  
  3. Statistiques
    - Évolution des scores
    - Statistiques de précision (fairways, greens)
    - Statistiques de putting
    - Historique détaillé des parties
*/

-- Ajout d'un commentaire sur la version
COMMENT ON DATABASE postgres IS 'Golf Performance Tracker - Version 1.0.0';

-- Ajout de métadonnées de version dans une nouvelle table
CREATE TABLE IF NOT EXISTS app_metadata (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insertion de la version actuelle
INSERT INTO app_metadata (key, value)
VALUES ('version', '1.0.0')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- Activation de RLS sur la table de métadonnées
ALTER TABLE app_metadata ENABLE ROW LEVEL SECURITY;

-- Politique de lecture des métadonnées
CREATE POLICY "Lecture des métadonnées"
  ON app_metadata
  FOR SELECT
  TO authenticated
  USING (true);