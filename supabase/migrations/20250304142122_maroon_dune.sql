/*
  # Création de la table des profils utilisateurs

  1. Nouvelle Table
    - `user_profiles`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence à auth.users)
      - `handicap` (float, nullable)
      - `preferred_tee` (text, valeur par défaut 'yellow')
      - `club_membership` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Sécurité
    - Activation de RLS sur la table `user_profiles`
    - Ajout de politiques pour que les utilisateurs puissent gérer leur propre profil
*/

-- Création de la table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  handicap float,
  preferred_tee text DEFAULT 'yellow',
  club_membership text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Les utilisateurs peuvent lire leur propre profil"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leur propre profil"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ajout d'un index pour améliorer les performances
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Ajout d'un trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profile_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profile_updated_at();