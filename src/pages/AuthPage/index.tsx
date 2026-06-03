import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { loginUser, signupUser } from '../../services/auth.service';
import { RuneCanvas } from '../../components/RuneCanvas';
import { Icons } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import logo from '../../assets/logo.png';

interface AuthPageProps {
  onEnterApp: () => void;
}

export function AuthPage({ onEnterApp }: AuthPageProps) {
  const { t } = useTranslation();
  const [isStarted, setIsStarted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser, user: savedUser } = useAuthStore();

  const handleStart = useCallback(() => {
    if (!isStarted) {
      setIsStarted(true);
      
      // Si on a déjà un compte sauvegardé, on entre direct dans l'app après l'anime de start
      if (savedUser) {
        setTimeout(() => {
          onEnterApp();
        }, 800);
      } else {
        // Sinon, on ouvre la modale après l'effet de zoom
        setTimeout(() => setShowAuthModal(true), 600);
      }
    }
  }, [isStarted, savedUser, onEnterApp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        handleStart();
      }
    };
    const handleClick = () => handleStart();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [handleStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = isLogin 
        ? await loginUser(pseudo, password)
        : await signupUser(pseudo, password);
      
      setUser(user, rememberMe);
      // Une fois connecté, on déverrouille l'app
      onEnterApp();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#050507] overflow-hidden flex flex-col items-center justify-center text-white font-sans">
      {/* BACKGROUND & EFFECTS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#050507_100%)]" />
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        <div className="absolute inset-0 bg-vignette pointer-events-none" />
        <RuneCanvas />
      </div>

      {/* LANDING CONTENT */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${isStarted ? 'scale-110 opacity-0 blur-xl pointer-events-none' : 'opacity-100'}`}>
        <div className="mb-12 relative group">
          <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-3xl animate-pulse rounded-full" />
          <div className="relative p-8 rounded-full border-2 border-gold-DEFAULT/40 bg-[#0D0D0F]/80 backdrop-blur-md">
            <img src={logo} alt="Signet Logo" className="w-24 h-24 object-contain animate-rune-pulse" />
          </div>
        </div>

        <h1 className="text-7xl font-black text-gold-bright tracking-[0.5em] uppercase text-glow-gold mb-4 ml-[0.5em]">
          Signet
        </h1>
        <div className="flex items-center gap-6 mb-24">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-gold-muted/50" />
          <span className="text-sm font-cinzel text-gold-DEFAULT drop-shadow-md tracking-[0.4em] uppercase font-bold">Virtual Tabletop</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-gold-muted/50" />
        </div>

        <div className="flex flex-col items-center gap-6 animate-pulse">
          <span className="text-[10px] font-cinzel text-gold-bright tracking-[0.4em] uppercase font-bold">{t('auth.pressToStart')}</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-gold-bright via-gold-muted/50 to-transparent" />
        </div>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
          <div className="w-full max-w-md bg-[#0D0D0F] border-2 border-gold-DEFAULT/40 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">
                    {isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}
                  </h2>
                  <p className="text-gold-bright text-[10px] font-cinzel tracking-[0.2em] mt-1 font-bold">
                    {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label={t('auth.pseudoLabel')}
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder={t('auth.pseudoPlaceholder')}
                  leftIcon={<Icons.User className="w-5 h-5" />}
                  required
                />

                <Input
                  label={t('auth.passwordLabel')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  leftIcon={<Icons.Lock className="w-5 h-5" />}
                  required
                />

                {/* REMEMBER ME CHECKBOX */}
                <div className="flex items-center gap-3 ml-2 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-gold-DEFAULT border-gold-DEFAULT shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-gold-border bg-[#0D0D0F]/80'}`}>
                    {rememberMe && <Icons.Check className="w-3.5 h-3.5 text-black stroke-[4px]" />}
                  </div>
                  <span className="text-[10px] font-cinzel font-bold text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright transition-colors tracking-widest uppercase">
                    {t('auth.rememberMe')}
                  </span>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-xs font-bold text-center italic animate-in shake">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  hasSheen
                  isLoading={isLoading}
                  rightIcon={<Icons.ChevronRight className="w-5 h-5" />}
                >
                  {isLogin ? t('auth.loginButton') : t('auth.signupButton')}
                </Button>
              </form>

              <div className="mt-10 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                >
                  {isLogin ? t('auth.switchToSignup') : t('auth.switchToLogin')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER INFO */}
      <div className="absolute bottom-8 text-[10px] font-cinzel text-white/20 tracking-[0.3em] uppercase pointer-events-none">
        {t('app.version')}
      </div>
    </div>
  );
}
