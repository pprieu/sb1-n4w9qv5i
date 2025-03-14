/*
  # Ajout de parcours de golf

  1. Données
    - Ajoute plusieurs parcours de golf dans la région de Bordeaux
  2. Sécurité
    - Vérifie l'existence des parcours avant insertion pour éviter les doublons
*/

DO $$
BEGIN
  -- Golf du Médoc Resort
  IF NOT EXISTS (SELECT 1 FROM golf_courses WHERE name = 'Golf du Médoc Resort') THEN
    INSERT INTO golf_courses (name, location) VALUES ('Golf du Médoc Resort', 'Le Pian-Médoc');
  END IF;

  -- Golf Bordelais
  IF NOT EXISTS (SELECT 1 FROM golf_courses WHERE name = 'Golf Bordelais') THEN
    INSERT INTO golf_courses (name, location) VALUES ('Golf Bordelais', 'Bordeaux');
  END IF;

  -- Golf de Pessac
  IF NOT EXISTS (SELECT 1 FROM golf_courses WHERE name = 'Golf de Pessac') THEN
    INSERT INTO golf_courses (name, location) VALUES ('Golf de Pessac', 'Pessac');
  END IF;

  -- Golf des Graves et du Sauternais
  IF NOT EXISTS (SELECT 1 FROM golf_courses WHERE name = 'Golf des Graves et du Sauternais') THEN
    INSERT INTO golf_courses (name, location) VALUES ('Golf des Graves et du Sauternais', 'Saint-Pardon-de-Conques');
  END IF;

  -- Golf de Bordeaux-Lac
  IF NOT EXISTS (SELECT 1 FROM golf_courses WHERE name = 'Golf de Bordeaux-Lac') THEN
    INSERT INTO golf_courses (name, location) VALUES ('Golf de Bordeaux-Lac', 'Bordeaux');
  END IF;
END $$;