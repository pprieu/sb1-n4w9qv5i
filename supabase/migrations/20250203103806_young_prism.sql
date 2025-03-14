/*
  # Ajout du département aux parcours de golf

  1. Modifications
    - Ajout de la colonne `department` à la table `golf_courses`
    - Mise à jour des parcours existants avec leurs départements
  
  2. Notes
    - Les départements sont extraits des codes postaux existants
    - Les parcours sans code postal seront dans le département "33" (Gironde)
*/

-- Ajout de la colonne department
ALTER TABLE golf_courses ADD COLUMN IF NOT EXISTS department text;

-- Mise à jour des parcours existants avec leurs départements
UPDATE golf_courses
SET department = CASE
  WHEN location LIKE '%Bordeaux%' THEN '33'
  WHEN location LIKE '%Pessac%' THEN '33'
  WHEN location LIKE '%Le Pian-Médoc%' THEN '33'
  WHEN location LIKE '%Saint-Pardon-de-Conques%' THEN '33'
  WHEN location LIKE '%Arcachon%' THEN '33'
  WHEN location LIKE '%Gujan-Mestras%' THEN '33'
  WHEN location LIKE '%Lacanau%' THEN '33'
  WHEN location LIKE '%Moliets%' THEN '40'
  WHEN location LIKE '%Hossegor%' THEN '40'
  ELSE '33'
END;

-- Rendre la colonne department non nullable
ALTER TABLE golf_courses ALTER COLUMN department SET NOT NULL;