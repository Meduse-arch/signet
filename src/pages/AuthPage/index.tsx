import { useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { loginUser, signupUser } from '../../services/auth.service';
import { RuneCanvas } from '../../components/RuneCanvas';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!pseudo || !password) {
        throw new Error("Veuillez remplir tous les champs.");
      }

      if (isLogin) {
        const user = await loginUser(pseudo, password);
        setUser(user);
      } else {
        const user = await signupUser(pseudo, password);
        setUser(user);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen w-full bg-surface overflow-hidden">
      <RuneCanvas />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-surface-card/80 backdrop-blur-xl border border-gold-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(212,160,23,0.15)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#e8d5a0] tracking-wider mb-2">Sigil VTT</h1>
          <p className="text-sm text-gold-dim">
            {isLogin ? "Connectez-vous pour rejoindre l'aventure" : "Créez votre compte pour commencer"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gold-dim mb-1">Pseudo</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="w-full bg-surface-sidebar border border-border-dark rounded-lg px-4 py-2.5 text-sm text-[#e8d5a0] placeholder:text-gold-dim/50 focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT transition-all"
              placeholder="Votre pseudo..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-dim mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-sidebar border border-border-dark rounded-lg px-4 py-2.5 text-sm text-[#e8d5a0] placeholder:text-gold-dim/50 focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-[#2a1f00] border border-[#d4a017]/30 rounded-lg text-xs text-gold-DEFAULT">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#3a2800] hover:bg-[#4a3500] text-[#e8c060] text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-[#2a2015]"
          >
            {isLoading ? "Veuillez patienter..." : isLogin ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-gold-dim hover:text-gold-bright transition-colors"
          >
            {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}