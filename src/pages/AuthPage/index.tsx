import { useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { loginUser, signupUser } from '../../services/auth.service';
import { RuneCanvas } from '../../components/RuneCanvas';
import { Shield, Loader2 } from 'lucide-react';

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
    <div className="relative flex items-center justify-center h-screen w-full bg-[#050507] overflow-hidden">
      {/* Fond avec animation runique discrète */}
      <div className="absolute inset-0 z-0 opacity-40">
        <RuneCanvas />
      </div>
      
      {/* Logo Style Netflix/Prime */}
      <div className="absolute top-10 left-10 z-20">
        <h1 className="text-3xl font-black text-gold-bright tracking-[0.2em] font-cinzel">
          SIGIL
        </h1>
      </div>

      <div className="relative z-10 w-full max-w-[450px] p-12 bg-black/60 backdrop-blur-2xl rounded-lg border border-white/5 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-8">
          {isLogin ? "S'identifier" : "S'inscrire"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="w-full bg-[#333] border-none rounded py-4 px-5 text-white placeholder:text-gray-500 focus:bg-[#444] transition-all outline-none"
              placeholder="Pseudo"
            />
          </div>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#333] border-none rounded py-4 px-5 text-white placeholder:text-gray-500 focus:bg-[#444] transition-all outline-none"
              placeholder="Mot de passe"
            />
          </div>

          {error && (
            <p className="text-[#e87c03] text-sm py-1 px-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gold-DEFAULT hover:bg-gold-bright text-black font-bold rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Se connecter" : "Créer un compte")}
          </button>
        </form>

        <div className="mt-10 flex flex-col gap-4">
          <p className="text-gray-500 text-sm">
            {isLogin ? "Nouveau sur Sigil VTT ?" : "Déjà un compte ?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-white hover:underline ml-1 font-medium"
            >
              {isLogin ? "Inscrivez-vous maintenant." : "Connectez-vous."}
            </button>
          </p>
          <p className="text-gray-600 text-[11px] leading-tight">
            Cette page est protégée par les arcanes numériques pour garantir votre sécurité.
          </p>
        </div>
      </div>
    </div>
  );
}