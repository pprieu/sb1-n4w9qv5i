import React, { useState, useEffect } from 'react';
import { Bold as Golf, History, Star, User, Users } from 'lucide-react';
import CourseList from './components/CourseList';
import ScoreCard from './components/ScoreCard';
import Statistics from './components/Statistics';
import GroupList from './components/GroupList';
import Auth from './components/Auth';
import NetworkStatus from './components/NetworkStatus';
import UserProfile from './components/UserProfile';
import { supabase, checkUser, handleEmailConfirmation } from './supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<'courses' | 'scorecard' | 'stats' | 'groups'>('courses');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [roundToLoad, setRoundToLoad] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [emailConfirmationStatus, setEmailConfirmationStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    // Vérifier si l'application est en mode local
    const checkLocalMode = () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl === 'your_supabase_url' || 
          supabaseKey === 'your_supabase_anon_key') {
        setIsLocalMode(true);
        setLoading(false);
        setConnectionError('Application en mode local. Configurez les variables d\'environnement Supabase dans le fichier .env');
        return true;
      }
      return false;
    };

    const initializeAuth = async () => {
      try {
        // Vérifier si on est en mode local
        if (checkLocalMode()) {
          return;
        }
        
        // Vérifier la confirmation d'email dans l'URL
        const confirmationResult = await handleEmailConfirmation();
        if (confirmationResult.success) {
          setEmailConfirmationStatus({
            success: true,
            message: 'Votre email a été confirmé avec succès ! Vous êtes maintenant connecté.'
          });
          setTimeout(() => {
            setEmailConfirmationStatus(null);
          }, 5000);
        }
        
        const currentUser = await checkUser();
        setUser(currentUser);
      } catch (error) {
        // Ne pas afficher d'erreur pour "Auth session missing" car c'est normal
        if (!(error instanceof Error && error.message === 'Auth session missing!')) {
          console.error('Erreur lors de l\'initialisation de l\'auth:', error);
        }
      } finally {
        if (!isLocalMode) {
          checkConnection();
        }
      }
    };

    initializeAuth();
    
    if (!isLocalMode) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        if (session) {
          setShowAuth(false);
        }
      });
      
      // Nettoyage de l'abonnement
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [isLocalMode]);

  useEffect(() => {
    const handleTabSwitch = (event: CustomEvent<{ tab: 'courses' | 'scorecard' | 'stats' | 'groups', roundId?: string }>) => {
      setActiveTab(event.detail.tab);
      if (event.detail.roundId) {
        setRoundToLoad(event.detail.roundId);
      }
    };

    window.addEventListener('switchTab', handleTabSwitch as EventListener);

    // Ajouter des gestionnaires d'événements pour détecter les changements de connectivité
    const handleOnline = () => {
      if (!isLocalMode) {
        checkConnection();
      }
    };

    const handleOffline = () => {
      setIsSupabaseConnected(false);
      setConnectionError('Votre appareil est hors ligne. Vérifiez votre connexion Internet.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('switchTab', handleTabSwitch as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isLocalMode]);

  const checkConnection = async () => {
    if (isLocalMode) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase.from('golf_courses').select('count');
      
      if (error) {
        if (error.message === 'Failed to fetch' || (error.message && error.message.includes('network'))) {
          throw new Error('Problème de connexion réseau');
        } else {
          throw error;
        }
      }
      
      setIsSupabaseConnected(true);
      setConnectionError(null);
      setRetryAttempts(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setConnectionError(errorMessage === 'Problème de connexion réseau' 
        ? 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.' 
        : errorMessage);
      setIsSupabaseConnected(false);
      
      // Implémentation d'un backoff exponentiel pour les tentatives
      if (retryAttempts < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryAttempts), 10000);
        setTimeout(() => {
          setRetryAttempts(prev => prev + 1);
          checkConnection();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-700 text-white p-4 shadow-lg">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Golf Performance Tracker</h1>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        </main>
      </div>
    );
  }

  if (isLocalMode || !isSupabaseConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-700 text-white p-4 shadow-lg">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Golf Performance Tracker</h1>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {isLocalMode ? "Configuration requise" : "Erreur de connexion"}
            </h2>
            {connectionError && (
              <div className={`${isLocalMode ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-red-50 border-red-200 text-red-700"} px-4 py-3 rounded-lg mb-6 border`}>
                <p className="font-medium">Information :</p>
                <p className="text-sm">{connectionError}</p>
              </div>
            )}
            <p className="text-gray-600 mb-6">
              {isLocalMode 
                ? "Pour utiliser cette application, vous devez configurer une connexion à Supabase. Suivez les instructions dans le fichier export-instructions.md pour configurer votre environnement local."
                : "Impossible de se connecter à la base de données. Cela peut être dû à un problème de connexion Internet ou à une maintenance du serveur."}
            </p>
            {!isLocalMode && (
              <button
                onClick={checkConnection}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Réessayer
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold">Golf Performance Tracker</h1>
          {user ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowProfile(true)}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-colors flex items-center"
              >
                <User className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Profil</span>
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 transition-colors"
            >
              Se connecter
            </button>
          )}
        </div>
      </header>

      {emailConfirmationStatus && (
        <div className={`p-4 ${emailConfirmationStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} fixed top-20 right-4 rounded-lg shadow-md z-50 max-w-md`}>
          <p className="font-medium">{emailConfirmationStatus.message}</p>
        </div>
      )}

      <main className="container mx-auto p-4">
        <nav className="flex justify-center mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center px-4 py-2 mx-2 mb-2 rounded-lg ${
              activeTab === 'courses' ? 'bg-green-600 text-white' : 'bg-white text-green-700'
            }`}
          >
            <Golf className="w-5 h-5 mr-2" />
            Parcours
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex items-center px-4 py-2 mx-2 mb-2 rounded-lg ${
              activeTab === 'scorecard' ? 'bg-green-600 text-white' : 'bg-white text-green-700'
            }`}
          >
            <Star className="w-5 h-5 mr-2" />
            Score
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center px-4 py-2 mx-2 mb-2 rounded-lg ${
              activeTab === 'stats' ? 'bg-green-600 text-white' : 'bg-white text-green-700'
            }`}
          >
            <History className="w-5 h-5 mr-2" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center px-4 py-2 mx-2 mb-2 rounded-lg ${
              activeTab === 'groups' ? 'bg-green-600 text-white' : 'bg-white text-green-700'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            Groupes
          </button>
        </nav>

        {activeTab === 'courses' && <CourseList />}
        {activeTab === 'scorecard' && <ScoreCard roundToLoad={roundToLoad} onRoundLoaded={() => setRoundToLoad(null)} />}
        {activeTab === 'stats' && <Statistics />}
        {activeTab === 'groups' && <GroupList />}
      </main>

      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      <NetworkStatus />
    </div>
  );
}