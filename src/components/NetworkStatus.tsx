import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [statusTimeout, setStatusTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    // Vérifier si l'application est en mode local (sans connexion Supabase)
    const checkLocalMode = () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Si les variables d'environnement ne sont pas définies ou sont vides
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl === 'your_supabase_url' || 
          supabaseKey === 'your_supabase_anon_key') {
        setIsLocalMode(true);
        setIsSupabaseConnected(false);
        setShowStatus(true);
      }
    };
    
    checkLocalMode();
    
    const checkSupabaseConnection = async () => {
      // Ne pas vérifier si en mode local
      if (isLocalMode) return;
      
      // Éviter les vérifications trop fréquentes (limitation de débit)
      const now = Date.now();
      if (now - lastCheckTime < 5000) {
        return;
      }
      
      setLastCheckTime(now);
      
      try {
        const { error } = await supabase.from('golf_courses').select('count');
        setIsSupabaseConnected(!error);
        if (!error && !isSupabaseConnected) {
          // Connexion rétablie
          setShowStatus(true);
          if (statusTimeout) {
            clearTimeout(statusTimeout);
          }
          
          const timeout = setTimeout(() => {
            setShowStatus(false);
          }, 3000);
          
          setStatusTimeout(timeout);
        }
        setRetryCount(0);
      } catch (err) {
        setIsSupabaseConnected(false);
        setShowStatus(true);
        
        // Implémentation d'un backoff exponentiel pour les tentatives
        if (retryCount < 5) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkSupabaseConnection();
          }, retryDelay);
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      if (!isLocalMode) {
        checkSupabaseConnection();
      }
      
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
      
      const timeout = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      
      setStatusTimeout(timeout);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseConnected(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier la connexion initiale
    if (!isLocalMode) {
      checkSupabaseConnection();
    }

    // Configurer des vérifications périodiques de connexion lorsqu'on est en ligne
    let intervalId: NodeJS.Timeout;
    if (isOnline && !isLocalMode) {
      intervalId = setInterval(checkSupabaseConnection, 30000); // Vérifier toutes les 30 secondes
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [statusTimeout, isOnline, isSupabaseConnected, retryCount, lastCheckTime, isLocalMode]);

  if (!showStatus && isOnline && isSupabaseConnected) return null;

  return (
    <div className={`fixed bottom-4 left-4 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
      !isOnline ? 'bg-red-500' : 
      !isSupabaseConnected ? (isLocalMode ? 'bg-yellow-500' : 'bg-red-500') : 
      'bg-green-500'
    } text-white shadow-lg z-50`}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Connexion perdue. Vérifiez votre connexion Internet.</span>
        </>
      ) : !isSupabaseConnected ? (
        isLocalMode ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Mode local: Configurez Supabase dans le fichier .env</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Connexion à la base de données perdue. Réessayez plus tard.</span>
          </>
        )
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Connexion rétablie</span>
        </>
      )}
    </div>
  );
}