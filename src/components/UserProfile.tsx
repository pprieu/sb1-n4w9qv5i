import React, { useState, useEffect } from 'react';
import { Save, X, User, Award, Club as GolfClub } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { UserProfile } from '../types';

interface UserProfileProps {
  onClose: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    handicap: '',
    preferred_tee: 'yellow',
    club_membership: ''
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUserAndProfile() {
      try {
        setLoading(true);
        
        // Récupérer l'utilisateur actuel
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setError('Vous devez être connecté pour accéder à votre profil');
          return;
        }
        
        setUser(user);
        
        // Récupérer le profil de l'utilisateur
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        
        if (data) {
          setProfile(data);
          setFormData({
            handicap: data.handicap?.toString() || '',
            preferred_tee: data.preferred_tee || 'yellow',
            club_membership: data.club_membership || ''
          });
        }
      } catch (err) {
        console.error('Erreur lors du chargement du profil:', err);
        setError('Impossible de charger votre profil. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    }
    
    loadUserAndProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Vous devez être connecté pour mettre à jour votre profil');
      return;
    }
    
    try {
      setSaving(true);
      
      const profileData = {
        user_id: user.id,
        handicap: formData.handicap ? parseFloat(formData.handicap) : null,
        preferred_tee: formData.preferred_tee,
        club_membership: formData.club_membership,
        updated_at: new Date().toISOString()
      };
      
      if (profile) {
        // Mettre à jour le profil existant
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', profile.id);
        
        if (error) throw error;
      } else {
        // Créer un nouveau profil
        const { error } = await supabase
          .from('user_profiles')
          .insert([{ ...profileData, created_at: new Date().toISOString() }]);
        
        if (error) throw error;
      }
      
      // Afficher un message de succès
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Profil mis à jour avec succès';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
      
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du profil:', err);
      setError('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Mon profil de golfeur
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Award className="w-4 h-4 mr-1" />
              Handicap
            </label>
            <input
              type="number"
              id="handicap"
              name="handicap"
              value={formData.handicap}
              onChange={handleChange}
              step="0.1"
              min="-10"
              max="54"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              placeholder="Exemple: 18.5"
            />
            <p className="mt-1 text-xs text-gray-500">
              Laissez vide si vous n'avez pas de handicap officiel
            </p>
          </div>

          <div>
            <label htmlFor="preferred_tee" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <GolfClub className="w-4 h-4 mr-1" />
              Départ préféré
            </label>
            <select
              id="preferred_tee"
              name="preferred_tee"
              value={formData.preferred_tee}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="white">Blanc</option>
              <option value="yellow">Jaune</option>
              <option value="blue">Bleu</option>
              <option value="red">Rouge</option>
            </select>
          </div>

          <div>
            <label htmlFor="club_membership" className="block text-sm font-medium text-gray-700 mb-1">
              Club d'appartenance
            </label>
            <input
              type="text"
              id="club_membership"
              name="club_membership"
              value={formData.club_membership}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              placeholder="Nom de votre club"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mr-2"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}