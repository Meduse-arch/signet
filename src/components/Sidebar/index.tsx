import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../ui/Icons';
import { useUIStore } from '../../store/ui';
import { SecurityLevel, useAuthStore } from '../../store/auth';

import logo from '../../assets/logo.svg';
import { SignetLogo } from '../ui/SignetLogo';

interface SidebarProps {
 onSearchToggle: () => void;
 onKeyOpen: () => void;
}

export function Sidebar({ onSearchToggle, onKeyOpen }: SidebarProps) {
 const { t, i18n } = useTranslation();
 const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, setShowCreateModal } = useUIStore();
 const { logout, user } = useAuthStore();
 const isMJ = user && user.role >= SecurityLevel.MJ;



 const navItems = [
 { id: 'library', icon: Icons.Library, label: t('sidebar.library'), action: () => setActiveTab('library') },
 { id: 'search', icon: Icons.Search, label: t('sidebar.search'), action: () => { setActiveTab('search'); onSearchToggle(); } },
 ] as const;

 return (
 <div 
 className={`h-full bg-surface-sidebar border-r border-silver-DEFAULT/30 flex flex-col transition-all duration-300 z-10 relative ${
 sidebarOpen ? 'w-[220px]' : 'w-[64px]'
 }`}
 >
 {/* Texture Grimoire */}
 <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none" />

 {/* Logo Section */}
 <div className="pt-8 pb-4 flex justify-center relative z-10">
 <div className={`transition-all duration-300 ${sidebarOpen ? 'w-24 h-24' : 'w-10 h-10'}`}>
 <SignetLogo mode="hover" imgClassName="w-full h-full filter drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
 </div>
 </div>

 <div className="flex-1 py-4 px-2 space-y-4 relative z-10">
 {navItems.map((item) => {
 const Icon = item.icon;
 const isActive = activeTab === item.id;
 return (
 <button
 key={item.id}
 onClick={item.action}
 className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border ${
 isActive 
 ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT/30 text-glacier-bright shadow-rune-gold' 
 : 'border-transparent hover:bg-glacier-DEFAULT/5 text-silver-bright drop-shadow-md hover:text-glacier-bright hover:border-silver-DEFAULT/30'
 }`}
 title={!sidebarOpen ? item.label : undefined}
 >
 <div className="relative">
 <Icon className={`flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-glacier-bright animate-rune-pulse' : ''}`} />
 {isActive && (
 <div className="absolute inset-0 bg-glacier-DEFAULT/20 blur-md rounded-full" />
 )}
 </div>
 <span 
 className={`text-xs font-quantico font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
 sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
 }`}
 >
 {item.label}
 </span>
 </button>
 );
 })}

 {/* BOUTON ACTION CLÉ */}
 <button
 onClick={onKeyOpen}
 className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border border-transparent hover:bg-glacier-DEFAULT/5 text-silver-bright drop-shadow-md hover:text-glacier-bright hover:border-silver-DEFAULT/30"
 title={!sidebarOpen ? t('sidebar.joinKey') : undefined}
 >
 <div className="relative">
 <Icons.Key className="flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110" />
 </div>
 <span 
 className={`text-xs font-quantico font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
 sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
 }`}
 >
 {t('sidebar.joinKey')}
 </span>
 </button>

 {/* BOUTON CRÉER SESSION */}
 {isMJ && (
 <button
 onClick={() => setShowCreateModal(true)}
 className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border border-transparent hover:bg-glacier-DEFAULT/5 text-silver-bright hover:text-glacier-bright hover:border-silver-DEFAULT/30"
 title={!sidebarOpen ? t('sidebar.createSession') : undefined}
 >
 <div className="relative">
 <Icons.Plus className="flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110" />
 </div>
 <span 
 className={`text-xs font-quantico font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
 sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
 }`}
 >
 {t('sidebar.createSession')}
 </span>
 </button>
 )}
 </div>
 
 <div className="p-3 pb-8 border-t border-silver-DEFAULT/30 space-y-3 relative z-10 bg-black/20">
 
 <div className="flex flex-col gap-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-3 gap-4' : 'justify-center'} py-2.5 rounded-xl transition-all group ${
            activeTab === 'settings' 
              ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT/30 text-glacier-bright shadow-rune-glacier border' 
              : 'hover:bg-glacier-DEFAULT/5 text-silver-bright drop-shadow-md/60 hover:text-glacier-bright border border-transparent hover:border-silver-DEFAULT/30'
          }`}
          title={!sidebarOpen ? t('sidebar.settings') : undefined}
        >
          <Icons.Settings className={`w-5 h-5 transition-transform duration-500 ${activeTab === 'settings' ? 'rotate-90 text-glacier-bright' : 'group-hover:rotate-45'}`} />
          <span className={`text-xs font-quantico font-black tracking-[0.1em] uppercase whitespace-nowrap transition-all duration-300 ${
            sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
          }`}>
            {t('sidebar.settings')}
          </span>
        </button>
 
 <button
 onClick={() => setSidebarOpen(!sidebarOpen)}
 className="w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-glacier-DEFAULT/5 text-silver-bright drop-shadow-md/40 hover:text-glacier-bright transition-all"
 >
 {sidebarOpen ? <Icons.ChevronLeft className="w-5 h-5" /> : <Icons.ChevronRight className="w-5 h-5" />}
 </button>
 </div>
 </div>


 </div>
 );
}
