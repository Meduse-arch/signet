import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../components/ui/Icons';

interface ConsentPageProps {
  onAccept: () => void;
}

export function ConsentPage({ onAccept }: ConsentPageProps) {
  const { t } = useTranslation();
  const [hasRead, setHasRead] = useState(false);

  const handleAccept = () => {
    localStorage.setItem('signet_consent_accepted', 'true');
    onAccept();
  };

  return (
    <div className="relative h-screen w-full bg-[#050507] overflow-hidden flex flex-col items-center justify-center text-white font-sans">
      {/* BACKGROUND & EFFECTS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#050507_100%)]" />
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        <div className="absolute inset-0 bg-vignette pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-2xl bg-[#0D0D0F]/90 backdrop-blur-xl border border-silver-DEFAULT/20 rounded-[2rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-700">
        
        <div className="flex flex-col items-center text-center mb-10">
          <Icons.ShieldAlert className="w-16 h-16 text-glacier-bright mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-white tracking-widest uppercase italic">
            {t('consent.title', 'Bienvenue dans Signet VTT')}
          </h1>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-silver-DEFAULT/50 to-transparent mt-4" />
        </div>

        <div className="space-y-6 text-sm text-silver-bright/90 font-inter leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar pr-4">
          
          <div className="bg-black/40 border border-silver-DEFAULT/10 p-5 rounded-xl">
            <h3 className="text-glacier-bright font-bold uppercase tracking-wider mb-2 text-xs">
              <Icons.Network className="w-4 h-4 inline-block mr-2 -mt-1" />
              {t('consent.p2pTitle', 'Connexion Peer-to-Peer')}
            </h3>
            <p>
              {t('consent.p2pText', "Signet VTT fonctionne sans serveur central. Vous vous connectez directement au Maître du Jeu et aux autres joueurs (WebRTC). Par conséquent, l'adresse IP publique du MJ est visible par les joueurs, et votre adresse IP publique est techniquement visible par le MJ et les autres participants.")}
            </p>
          </div>

          <div className="bg-black/40 border border-silver-DEFAULT/10 p-5 rounded-xl">
            <h3 className="text-glacier-bright font-bold uppercase tracking-wider mb-2 text-xs">
              <Icons.ImageIcon className="w-4 h-4 inline-block mr-2 -mt-1" />
              {t('consent.liabilityTitle', "Droits d'Auteur et Contenus")}
            </h3>
            <p>
              {t('consent.liabilityText', "Vous vous engagez à ne pas utiliser d'images, de musiques ou de contenus dont vous ne possédez pas les droits. Vous êtes seul responsable des fichiers que vous chargez ou partagez via des liens externes. Le créateur de Signet VTT n'héberge aucun de ces fichiers de campagne et décline toute responsabilité quant à l'utilisation d'œuvres protégées sans autorisation.")}
            </p>
          </div>

          <div className="bg-black/40 border border-silver-DEFAULT/10 p-5 rounded-xl">
            <h3 className="text-glacier-bright font-bold uppercase tracking-wider mb-2 text-xs">
              <Icons.Database className="w-4 h-4 inline-block mr-2 -mt-1" />
              {t('consent.dataTitle', 'Données Personnelles')}
            </h3>
            <p>
              {t('consent.dataText', "Seul votre pseudo et votre mot de passe (haché de manière sécurisée) sont stockés sur nos serveurs pour permettre votre connexion. Toutes les autres données de jeu (cartes, musiques, personnages) sont stockées localement sur votre machine ou échangées en direct via le réseau P2P.")}
            </p>
          </div>

          <div className="bg-black/40 border border-silver-DEFAULT/10 p-5 rounded-xl">
            <h3 className="text-glacier-bright font-bold uppercase tracking-wider mb-2 text-xs">
              <Icons.AlertTriangle className="w-4 h-4 inline-block mr-2 -mt-1" />
              {t('consent.warrantyTitle', 'Absence de Garantie')}
            </h3>
            <p>
              {t('consent.warrantyText', "Signet VTT est fourni \"en l'état\". Bien que nous fassions de notre mieux pour assurer la stabilité du logiciel, le créateur ne peut être tenu responsable en cas de perte de données (campagnes, personnages), de bugs, ou d'interruptions de service.")}
            </p>
          </div>

        </div>

        <div className="mt-10 flex flex-col items-center gap-6">
          <div 
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => setHasRead(!hasRead)}
          >
            <div className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${hasRead ? 'bg-glacier-DEFAULT border-silver-DEFAULT shadow-[0_0_10px_rgba(79,164,184,0.4)]' : 'border-silver-DEFAULT/30 bg-black/50 group-hover:border-silver-DEFAULT/60'}`}>
              {hasRead && <Icons.Check className="w-4 h-4 text-black stroke-[4px]" />}
            </div>
            <span className={`text-xs font-bold tracking-widest uppercase transition-colors ${hasRead ? 'text-glacier-bright' : 'text-silver-bright group-hover:text-white'}`}>
              {t('consent.understandText', "J'ai lu et je comprends ces conditions")}
            </span>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!hasRead}
            hasSheen={hasRead}
            onClick={handleAccept}
          >
            {t('consent.acceptButton', "J'accepte et je rejoins l'aventure")}
          </Button>
        </div>
      </div>
    </div>
  );
}
