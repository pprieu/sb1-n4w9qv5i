/*
  # Nettoyage des parcours en double

  1. Changements
    - Suppression des doublons dans la table golf_courses en conservant l'entrée la plus ancienne
    - Ajout d'une contrainte UNIQUE sur le nom des parcours pour éviter les futurs doublons

  2. Sécurité
    - Aucun impact sur les politiques RLS existantes
*/

-- Suppression des doublons en conservant l'entrée la plus ancienne
WITH duplicates AS (
  SELECT id,
         name,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
  FROM golf_courses
)
DELETE FROM golf_courses
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1
);

-- Ajout d'une contrainte UNIQUE sur le nom pour éviter les futurs doublons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'golf_courses_name_key'
  ) THEN
    ALTER TABLE golf_courses ADD CONSTRAINT golf_courses_name_key UNIQUE (name);
  END IF;
END $$;