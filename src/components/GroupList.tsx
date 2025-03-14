import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Settings, Trash2, X, Mail, UserCheck, UserMinus, ChevronRight, Shield, ShieldAlert } from 'lucide-react';
import type { Group, GroupMember, GroupInvitation, GroupPerformance } from '../types';
import GroupPerformanceComparison from './GroupPerformanceComparison';

export default function GroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupInvitations, setGroupInvitations] = useState<GroupInvitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [userInvitations, setUserInvitations] = useState<GroupInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [groupPerformances, setGroupPerformances] = useState<GroupPerformance[]>([]);
  const [loadingPerformances, setLoadingPerformances] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'performances'>('members');

  useEffect(() => {
    loadGroups();
    loadUserInvitations();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(selectedGroup.id);
      loadGroupInvitations(selectedGroup.id);
      loadGroupPerformances(selectedGroup.id);
    }
  }, [selectedGroup]);

  async function loadGroups() {
    try {
      setLoading(true);
      
      // Charger les groupes dont l'utilisateur est membre
      const { data: memberGroups, error: memberError } = await supabase
        .from('groups')
        .select(`
          *,
          member_count:group_members(count)
        `)
        .order('name');
      
      if (memberError) throw memberError;
      
      setGroups(memberGroups || []);
    } catch (err) {
      console.error('Erreur lors du chargement des groupes:', err);
      setError('Impossible de charger les groupes. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  }

  async function loadUserInvitations() {
    try {
      setLoadingInvitations(true);
      
      // Récupérer l'email de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Charger les invitations pour cet email
      const { data: invitations, error: invitationsError } = await supabase
        .from('group_invitations')
        .select(`
          *,
          group:groups(*),
          inviter_email:auth.users!invited_by(email)
        `)
        .eq('email', user.email)
        .eq('status', 'pending');
      
      if (invitationsError) throw invitationsError;
      
      setUserInvitations(invitations || []);
    } catch (err) {
      console.error('Erreur lors du chargement des invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  }

  async function loadGroupMembers(groupId: string) {
    try {
      setLoadingMembers(true);
      
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          *,
          user_email:auth.users!user_id(email),
          user_profile:user_profiles!user_id(*)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: false });
      
      if (membersError) throw membersError;
      
      setGroupMembers(members || []);
    } catch (err) {
      console.error('Erreur lors du chargement des membres:', err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadGroupInvitations(groupId: string) {
    try {
      const { data: invitations, error: invitationsError } = await supabase
        .from('group_invitations')
        .select(`
          *,
          inviter_email:auth.users!invited_by(email)
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending');
      
      if (invitationsError) throw invitationsError;
      
      setGroupInvitations(invitations || []);
    } catch (err) {
      console.error('Erreur lors du chargement des invitations:', err);
    }
  }

  async function loadGroupPerformances(groupId: string) {
    try {
      setLoadingPerformances(true);
      
      // Récupérer les performances des membres du groupe
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          user_email:auth.users!user_id(email),
          user_profile:user_profiles!user_id(*)
        `)
        .eq('group_id', groupId);
      
      if (membersError) throw membersError;
      
      if (!members || members.length === 0) {
        setGroupPerformances([]);
        return;
      }
      
      // Pour chaque membre, récupérer ses statistiques
      const performances: GroupPerformance[] = [];
      
      for (const member of members) {
        // Récupérer les parties terminées de l'utilisateur
        const { data: rounds, error: roundsError } = await supabase
          .from('rounds')
          .select(`
            id,
            holes:hole_scores(*)
          `)
          .eq('user_id', member.user_id)
          .eq('status', 'completed');
        
        if (roundsError) throw roundsError;
        
        if (!rounds || rounds.length === 0) {
          performances.push({
            user_id: member.user_id,
            user_email: member.user_email?.email,
            user_profile: member.user_profile,
            rounds_count: 0
          });
          continue;
        }
        
        // Calculer les statistiques
        let totalScore = 0;
        let totalPar = 0;
        let totalFairways = 0;
        let totalGIR = 0;
        let totalPutts = 0;
        let totalHoles = 0;
        
        rounds.forEach(round => {
          if (round.holes && round.holes.length > 0) {
            round.holes.forEach(hole => {
              totalScore += hole.score;
              totalPar += hole.par;
              if (hole.fairway_hit) totalFairways++;
              if (hole.green_in_regulation) totalGIR++;
              totalPutts += hole.putts;
              totalHoles++;
            });
          }
        });
        
        performances.push({
          user_id: member.user_id,
          user_email: member.user_email?.email,
          user_profile: member.user_profile,
          avg_score: totalHoles > 0 ? totalScore / totalHoles * 18 : undefined,
          avg_over_par: totalHoles > 0 ? (totalScore - totalPar) / totalHoles * 18 : undefined,
          fairway_percentage: totalHoles > 0 ? (totalFairways / totalHoles) * 100 : undefined,
          gir_percentage: totalHoles > 0 ? (totalGIR / totalHoles) * 100 : undefined,
          avg_putts: totalHoles > 0 ? totalPutts / totalHoles : undefined,
          rounds_count: rounds.length
        });
      }
      
      setGroupPerformances(performances);
    } catch (err) {
      console.error('Erreur lors du chargement des performances:', err);
    } finally {
      setLoadingPerformances(false);
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newGroup.name.trim()) return;
    
    try {
      setSaving(true);
      
      // Créer le groupe
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null
        }])
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Ajouter l'utilisateur comme admin du groupe
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          role: 'admin'
        }]);
      
      if (memberError) throw memberError;
      
      // Recharger les groupes
      await loadGroups();
      
      // Réinitialiser le formulaire
      setNewGroup({ name: '', description: '' });
      setShowCreateModal(false);
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Groupe créé avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la création du groupe:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de la création du groupe';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedGroup || !inviteEmail.trim()) return;
    
    try {
      setSendingInvite(true);
      
      // Vérifier si l'utilisateur est déjà membre du groupe
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', selectedGroup.id)
        .eq('user_email.email', inviteEmail.trim())
        .maybeSingle();
      
      if (memberError) throw memberError;
      
      if (existingMember) {
        throw new Error('Cet utilisateur est déjà membre du groupe');
      }
      
      // Vérifier si une invitation est déjà en attente pour cet email
      const { data: existingInvitation, error: invitationError } = await supabase
        .from('group_invitations')
        .select('id')
        .eq('group_id', selectedGroup.id)
        .eq('email', inviteEmail.trim())
        .eq('status', 'pending')
        .maybeSingle();
      
      if (invitationError) throw invitationError;
      
      if (existingInvitation) {
        throw new Error('Une invitation a déjà été envoyée à cet email');
      }
      
      // Envoyer l'invitation
      const { error: sendError } = await supabase
        .from('group_invitations')
        .insert([{
          group_id: selectedGroup.id,
          email: inviteEmail.trim()
        }]);
      
      if (sendError) throw sendError;
      
      // Recharger les invitations
      await loadGroupInvitations(selectedGroup.id);
      
      // Réinitialiser le formulaire
      setInviteEmail('');
      setShowInviteModal(false);
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Invitation envoyée avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'invitation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'invitation';
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = errorMessage;
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setSendingInvite(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!selectedGroup) return;
    
    try {
      const { error } = await supabase
        .from('group_invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
      
      // Recharger les invitations
      await loadGroupInvitations(selectedGroup.id);
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Invitation annulée';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'annulation de l\'invitation:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de l\'annulation de l\'invitation';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  async function acceptInvitation(invitationId: string) {
    try {
      setProcessingInvitation(invitationId);
      
      const { error } = await supabase.rpc('accept_group_invitation', {
        p_invitation_id: invitationId
      });
      
      if (error) throw error;
      
      // Recharger les invitations et les groupes
      await loadUserInvitations();
      await loadGroups();
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Invitation acceptée';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de l\'invitation:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de l\'acceptation de l\'invitation';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setProcessingInvitation(null);
    }
  }

  async function declineInvitation(invitationId: string) {
    try {
      setProcessingInvitation(invitationId);
      
      const { error } = await supabase.rpc('decline_group_invitation', {
        p_invitation_id: invitationId
      });
      
      if (error) throw error;
      
      // Recharger les invitations
      await loadUserInvitations();
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Invitation déclinée';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors du refus de l\'invitation:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors du refus de l\'invitation';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } finally {
      setProcessingInvitation(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!selectedGroup) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Recharger les membres
      await loadGroupMembers(selectedGroup.id);
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Membre retiré du groupe';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression du membre:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de la suppression du membre';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  async function toggleAdminRole(member: GroupMember) {
    if (!selectedGroup) return;
    
    try {
      const newRole = member.role === 'admin' ? 'member' : 'admin';
      
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', member.id);
      
      if (error) throw error;
      
      // Recharger les membres
      await loadGroupMembers(selectedGroup.id);
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = newRole === 'admin' 
        ? 'Membre promu administrateur' 
        : 'Administrateur rétrogradé en membre';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la modification du rôle:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de la modification du rôle';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  async function leaveGroup(groupId: string) {
    try {
      // Récupérer l'ID du membre
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: member, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      if (memberError) throw memberError;
      
      // Quitter le groupe
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', member.id);
      
      if (error) throw error;
      
      // Recharger les groupes
      await loadGroups();
      
      // Réinitialiser le groupe sélectionné
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Vous avez quitté le groupe';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la sortie du groupe:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de la sortie du groupe';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      // Supprimer les invitations
      const { error: invitationsError } = await supabase
        .from('group_invitations')
        .delete()
        .eq('group_id', groupId);
      
      if (invitationsError) throw invitationsError;
      
      // Supprimer les membres
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
      
      if (membersError) throw membersError;
      
      // Supprimer le groupe
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
      
      if (groupError) throw groupError;
      
      // Recharger les groupes
      await loadGroups();
      
      // Réinitialiser le groupe sélectionné
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Groupe supprimé avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression du groupe:', err);
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Erreur lors de la suppression du groupe';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  }

  // Vérifier si l'utilisateur est admin du groupe sélectionné
  const isAdmin = () => {
    if (!selectedGroup) return false;
    
    return groupMembers.some(member => 
      member.user_id === supabase.auth.getUser().then(({ data }) => data.user?.id) && 
      member.role === 'admin'
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            loadGroups();
          }}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
          <Users className="w-6 h-6 mr-2 text-green-600" />
          Groupes de golfeurs
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Créer un groupe
        </button>
      </div>

      {/* Invitations en attente */}
      {userInvitations.length > 0 && (
        <div className="mb-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Invitations en attente
          </h3>
          <div className="space-y-3">
            {userInvitations.map(invitation => (
              <div key={invitation.id} className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 flex justify-between items-center">
                <div>
                  <p className="font-medium">{invitation.group?.name}</p>
                  <p className="text-sm text-gray-600">
                    Invité par {invitation.inviter_email?.email?.split('@')[0]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => declineInvitation(invitation.id)}
                    disabled={processingInvitation === invitation.id}
                    className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => acceptInvitation(invitation.id)}
                    disabled={processingInvitation === invitation.id}
                    className="px-3 py-1.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des groupes et détails */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Liste des groupes */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">Mes groupes</h3>
            
            {groups.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-2">Vous n'êtes membre d'aucun groupe</p>
                <p className="text-gray-500 text-sm">
                  Créez un groupe ou attendez d'être invité
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <div 
                    key={group.id} 
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id 
                        ? 'bg-green-50 border-green-200 border' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-gray-600">
                          {group.member_count} membre{group.member_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveGroup(group.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                        title="Quitter le groupe"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Détails du groupe */}
        <div className="md:col-span-2">
          {selectedGroup ? (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedGroup.name}</h3>
                  {selectedGroup.description && (
                    <p className="text-gray-600 mt-1">{selectedGroup.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isAdmin() && (
                    <>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        <span>Inviter</span>
                      </button>
                      <button
                        onClick={() => deleteGroup(selectedGroup.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span>Supprimer</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Onglets */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'members'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Membres
                  </button>
                  <button
                    onClick={() => setActiveTab('performances')}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'performances'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Performances
                  </button>
                </nav>
              </div>
              
              {/* Contenu des onglets */}
              {activeTab === 'members' ? (
                <>
                  {/* Membres du groupe */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-3">Membres</h4>
                    {loadingMembers ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {groupMembers.map(member => (
                          <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              {member.role === 'admin' ? (
                                <Shield className="w-5 h-5 text-green-600 mr-2" />
                              ) : (
                                <User className="w-5 h-5 text-gray-400 mr-2" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {member.user_email?.email?.split('@')[0]}
                                  {member.role === 'admin' && (
                                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                      Admin
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">{member.user_email?.email}</p>
                              </div>
                            </div>
                            {isAdmin() && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleAdminRole(member)}
                                  className="p-1.5 text-gray-400 hover:text-green-600 rounded-full"
                                  title={member.role === 'admin' ? 'Rétrograder en membre' : 'Promouvoir administrateur'}
                                >
                                  {member.role === 'admin' ? (
                                    <ShieldAlert className="w-4 h-4" />
                                  ) : (
                                    <Shield className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => removeMember(member.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-full"
                                  title="Retirer du groupe"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Invitations en attente */}
                  {groupInvitations.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium mb-3">Invitations en attente</h4>
                      <div className="space-y-3">
                        {groupInvitations.map(invitation => (
                          <div key={invitation.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-xs text-gray-600">
                                Invité par {invitation.inviter_email?.email?.split('@')[0]}
                              </p>
                            </div>
                            {isAdmin() && (
                              <button
                                onClick={() => cancelInvitation(invitation.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-full"
                                title="Annuler l'invitation"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Performances */
                <div>
                  {loadingPerformances ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <GroupPerformanceComparison performances={groupPerformances} />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Sélectionnez un groupe</h3>
              <p className="text-gray-500">
                Choisissez un groupe dans la liste pour voir ses détails et les performances des membres
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de groupe */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Créer un groupe</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createGroup} className="p-4">
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Inviter un membre</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={sendInvitation} className="p-4">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'utilisateur recevra une invitation à rejoindre le groupe
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {sendingInvite ? 'Envoi...' : 'Inviter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}