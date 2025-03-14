/*
  # Ajout des fonctionnalités de groupes

  1. Nouvelles Tables
    - `groups` - Stocke les informations sur les groupes
    - `group_members` - Stocke les relations entre utilisateurs et groupes
    - `group_invitations` - Stocke les invitations aux groupes

  2. Sécurité
    - Activation de RLS sur toutes les nouvelles tables
    - Politiques pour contrôler l'accès aux groupes et aux membres
*/

-- Création de la table des groupes
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création de la table des membres de groupe
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'admin' ou 'member'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Création de la table des invitations de groupe
CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups NOT NULL,
  invited_by uuid REFERENCES auth.users NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, email)
);

-- Activation de RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les groupes
CREATE POLICY "Les utilisateurs peuvent voir les groupes dont ils sont membres"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des groupes"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Les administrateurs peuvent modifier leurs groupes"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Les administrateurs peuvent supprimer leurs groupes"
  ON groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Politiques RLS pour les membres de groupe
CREATE POLICY "Les membres peuvent voir les membres de leurs groupes"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Les administrateurs peuvent ajouter des membres"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    ) OR (
      -- Le créateur du groupe peut s'ajouter lui-même comme admin
      user_id = auth.uid() AND
      role = 'admin' AND
      EXISTS (
        SELECT 1 FROM groups
        WHERE groups.id = group_id
        AND groups.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Les administrateurs peuvent modifier les membres"
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Les membres peuvent quitter un groupe"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Politiques RLS pour les invitations de groupe
CREATE POLICY "Les membres peuvent voir les invitations de leurs groupes"
  ON group_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Les administrateurs peuvent créer des invitations"
  ON group_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Les administrateurs peuvent modifier les invitations"
  ON group_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Les administrateurs peuvent supprimer les invitations"
  ON group_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Ajout d'index pour améliorer les performances
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);

-- Fonction pour accepter une invitation
CREATE OR REPLACE FUNCTION accept_group_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_email text;
  v_user_email text;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Vérifier que l'invitation existe et correspond à l'email de l'utilisateur
  SELECT group_id, email INTO v_group_id, v_email
  FROM group_invitations
  WHERE id = p_invitation_id AND status = 'pending';
  
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invitation non trouvée ou déjà traitée';
  END IF;
  
  IF v_email != v_user_email THEN
    RAISE EXCEPTION 'Cette invitation ne vous est pas destinée';
  END IF;
  
  -- Mettre à jour le statut de l'invitation
  UPDATE group_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = p_invitation_id;
  
  -- Ajouter l'utilisateur comme membre du groupe
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

-- Fonction pour décliner une invitation
CREATE OR REPLACE FUNCTION decline_group_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_email text;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Vérifier que l'invitation existe et correspond à l'email de l'utilisateur
  SELECT email INTO v_email
  FROM group_invitations
  WHERE id = p_invitation_id AND status = 'pending';
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation non trouvée ou déjà traitée';
  END IF;
  
  IF v_email != v_user_email THEN
    RAISE EXCEPTION 'Cette invitation ne vous est pas destinée';
  END IF;
  
  -- Mettre à jour le statut de l'invitation
  UPDATE group_invitations
  SET status = 'declined', updated_at = now()
  WHERE id = p_invitation_id;
END;
$$;