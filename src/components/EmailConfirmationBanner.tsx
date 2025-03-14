import React from 'react';
import { Mail, X } from 'lucide-react';

interface EmailConfirmationBannerProps {
  email: string;
  onResend: () => Promise<void>;
  onClose: () => void;
}

export default function EmailConfirmationBanner({ email, onResend, onClose }: EmailConfirmationBannerProps) {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await onResend();
      setSuccess(true);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 relative">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">Confirmation d'email requise</h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>
              Un email de confirmation a été envoyé à <span className="font-semibold">{email}</span>.
              Veuillez vérifier votre boîte de réception et cliquer sur le lien pour activer votre compte.
            </p>
            
            {success && (
              <p className="mt-2 text-green-600 font-medium">
                Email de confirmation renvoyé avec succès !
              </p>
            )}
            
            {error && (
              <p className="mt-2 text-red-600">
                {error}
              </p>
            )}
            
            <div className="mt-3">
              <button
                onClick={handleResend}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}