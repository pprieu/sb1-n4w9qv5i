import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Les variables d\'environnement Supabase ne sont pas définies. Utilisation des valeurs par défaut pour le développement.');
}

export const supabase = createClient(
  supabaseUrl || 'https://mntnvtofzqvmjckbwzir.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udG52dG9menF2bWpja2J3emlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1NzY2NzAsImV4cCI6MjA1NDE1MjY3MH0.PzLIrbZ0pfH9ElTus0GB7C9CELH-PpSWYbCzdyA74fo',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Important pour les liens de confirmation d'email
      storage: window.localStorage,
      storageKey: 'golf-tracker-auth',
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-application-name': 'golf-tracker'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    // Ajouter une configuration de retry et timeout
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15 secondes de timeout
      }).catch(error => {
        // Gérer les erreurs de réseau de manière plus robuste
        console.error('Erreur de connexion Supabase:', error);
        // Retourner une réponse d'erreur formatée pour une meilleure gestion
        return new Response(JSON.stringify({
          error: {
            message: 'Erreur de connexion au serveur',
            details: error.message,
            networkError: true
          }
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    }
  }
);

// Initialiser la session au démarrage
let isInitialized = false;

const initializeSession = async () => {
  if (isInitialized) return;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // Gérer silencieusement les erreurs d'authentification
      if (error.message !== 'Auth session missing!') {
        console.warn('Avertissement lors de l\'initialisation de la session:', error.message);
      }
      isInitialized = true;
      return;
    }
    
    if (!session) {
      // Pas de session active, c'est normal pour un utilisateur non connecté
      isInitialized = true; // Marquer comme initialisé même sans session
      return;
    }
    
    isInitialized = true;
  } catch (error) {
    // Gérer silencieusement les erreurs
    console.warn('Avertissement lors de l\'initialisation de la session:', error instanceof Error ? error.message : 'Erreur inconnue');
    isInitialized = true; // Marquer comme initialisé même en cas d'erreur
  }
};

// Initialiser la session immédiatement
initializeSession();

// Écouter les changements d'état d'authentification
supabase.auth.onAuthStateChange(async (event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      isInitialized = true;
      break;
    case 'SIGNED_OUT':
      isInitialized = false;
      window.localStorage.removeItem('golf-tracker-auth');
      break;
    case 'TOKEN_REFRESHED':
      isInitialized = true;
      break;
    case 'USER_UPDATED':
      isInitialized = true;
      break;
    case 'USER_DELETED':
      isInitialized = false;
      window.localStorage.removeItem('golf-tracker-auth');
      break;
    case 'PASSWORD_RECOVERY':
      // Gérer le flux de récupération de mot de passe
      console.log('Password recovery initiated');
      break;
  }
});

// Exporter une fonction pour vérifier si l'utilisateur est connecté
export const checkUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Gérer silencieusement les erreurs d'authentification
      if (error.message === 'Auth session missing!') {
        // C'est normal pour un utilisateur non connecté, ne pas logger d'erreur
        return null;
      }
      console.warn('Avertissement lors de la vérification de l\'utilisateur:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    // Gérer silencieusement les erreurs
    if (error instanceof Error && error.message === 'Auth session missing!') {
      // C'est normal pour un utilisateur non connecté, ne pas logger d'erreur
      return null;
    }
    // Pour les autres erreurs, logger discrètement
    console.warn('Avertissement lors de la vérification de l\'utilisateur:', error instanceof Error ? error.message : 'Erreur inconnue');
    return null;
  }
};

// Gérer les redirections de confirmation d'email
export const handleEmailConfirmation = async () => {
  const { hash } = window.location;
  if (hash && (hash.includes('access_token') || hash.includes('error'))) {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Avertissement lors de la confirmation de l\'email:', error.message);
        return { success: false, error };
      }
      
      if (data?.session) {
        // Effacer le hash de l'URL après une confirmation réussie
        window.location.hash = '';
        return { success: true, session: data.session };
      }
    } catch (error) {
      console.warn('Erreur lors de la confirmation de l\'email:', error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }
  
  return { success: false };
};