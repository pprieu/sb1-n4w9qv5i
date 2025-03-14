import React, { useState } from 'react';
import { LogIn, UserPlus, X, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onClose: () => void;
}

export default function Auth({ onClose }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'confirmation'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Vérifier la force du mot de passe côté client
        if (password.length < 10) {
          setError('Le mot de passe doit contenir au moins 10 caractères.');
          setLoading(false);
          return;
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              created_at: new Date().toISOString()
            }
          }
        });
        
        if (error) {
          if (error.message === 'User already registered') {
            setError('Un compte existe déjà avec cet email. Veuillez vous connecter.');
            setMode('signin');
          } else if (error.message.includes('weak_password')) {
            setError('Le mot de passe est trop faible. Il doit contenir au moins 10 caractères.');
          } else {
            throw error;
          }
          return;
        }
        
        // Check if email confirmation is required
        if (data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at === null) {
          setConfirmationEmail(email);
          setMode('confirmation');
          return;
        }
        
        const message = document.createElement('div');
        message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        message.textContent = 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
        
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            setError('Email ou mot de passe incorrect');
          } else if (error.message.includes('Email not confirmed')) {
            setConfirmationEmail(email);
            setMode('confirmation');
          } else {
            throw error;
          }
          return;
        }
        
        // Recharger la page après une connexion réussie
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      setError('Une erreur est survenue lors de l\'authentification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      const message = document.createElement('div');
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      message.textContent = 'Email de confirmation renvoyé avec succès !';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (err) {
      console.error('Erreur lors du renvoi de l\'email:', err);
      setError('Une erreur est survenue lors du renvoi de l\'email. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-3">
            {mode === 'signin' ? (
              <LogIn className="w-6 h-6 text-green-600" />
            ) : mode === 'signup' ? (
              <UserPlus className="w-6 h-6 text-green-600" />
            ) : (
              <Mail className="w-6 h-6 text-green-600" />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">
          {mode === 'signin' ? 'Connexion' : mode === 'signup' ? 'Inscription' : 'Confirmation requise'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {mode === 'confirmation' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
              <p className="font-medium mb-2">Vérifiez votre boîte de réception</p>
              <p className="text-sm mb-3">
                Un email de confirmation a été envoyé à <span className="font-semibold">{confirmationEmail}</span>.
                Veuillez cliquer sur le lien dans cet email pour activer votre compte.
              </p>
              <p className="text-sm">
                Si vous ne trouvez pas l'email, vérifiez votre dossier spam ou courrier indésirable.
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400"
              >
                {loading ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
              </button>
              
              <button
                onClick={() => setMode('signin')}
                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
                minLength={mode === 'signup' ? 10 : 6}
              />
              <p className="mt-1 text-sm text-gray-500">
                {mode === 'signup' && 'Le mot de passe doit contenir au moins 10 caractères'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Chargement...
                </span>
              ) : mode === 'signin' ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </form>
        )}

        {mode !== 'confirmation' && (
          <div className="mt-4 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-green-600 hover:text-green-700"
            >
              {mode === 'signin'
                ? 'Pas encore de compte ? S\'inscrire'
                : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}