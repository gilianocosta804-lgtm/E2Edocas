import React, { useState, useEffect } from 'react';
import {
  Truck,
  FileSpreadsheet,
  Users,
  Settings,
  Smartphone,
  Radio,
  Clock,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  MapPin,
  QrCode,
  X,
  Lock,
  Crown,
  ChevronDown,
  Pause,
  Play,
  Coffee,
  MessageSquare,
  Boxes,
} from 'lucide-react';
import { CollaboratorUser, DockConfig } from '../types';
import { QRCodeTotemModal } from './QRCodeTotemModal';

interface NavbarProps {
  currentTab: 'dashboard' | 'driver' | 'sheet' | 'collaborators' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'driver' | 'sheet' | 'collaborators' | 'settings') => void;
  currentUser: CollaboratorUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  sseConnected: boolean;
  onOpenSettings: () => void;
  totalWaiting: number;
  docks: DockConfig[];
  onChangeDock?: (dockName: string) => void;
  onToggleDockPause?: (dockId: string, reason?: string) => void;
  onOpenChat?: () => void;
  onOpenCep?: () => void;
  onOpenPackageMovement?: (defaultSourceRoute?: string) => void;
  unreadChatCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenLogin,
  onLogout,
  sseConnected,
  onOpenSettings,
  totalWaiting,
  docks,
  onChangeDock,
  onToggleDockPause,
  onOpenChat,
  onOpenCep,
  onOpenPackageMovement,
  unreadChatCount = 0,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDockMenu, setShowDockMenu] = useState(false);

  // User Role and Permission Flags
  const isDriver = !currentUser;
  const isAdminOrMaster = Boolean(currentUser?.isMaster || currentUser?.isAdmin);
  const isCollaborator = Boolean(currentUser && !isAdminOrMaster);

  const canAccessSpreadsheet = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canViewSpreadsheet
  );
  const canManageUsers = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canManageUsers
  );
  const canMovePackages = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canMovePackages
  );
  const canUseChat = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canUseChat
  );
  const canConsultCep = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canConsultCep
  );

  // Collaborator's assigned dock status (for quick pause button)
  const myDock = docks.find(
    d => d.name.toLowerCase() === currentUser?.assignedDock?.toLowerCase()
  );
  const isMyDockPaused = myDock?.status === 'paused' || myDock?.isPaused;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!isDriver) {
                  setCurrentTab('dashboard');
                } else {
                  setCurrentTab('driver');
                }
              }}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 transition-colors group-hover:border-zinc-500">
                {isDriver ? <Smartphone className="w-4 h-4 text-emerald-400" /> : <Truck className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base tracking-tight text-white">
                    E2E - DOCAS
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isDriver
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold'
                        : isAdminOrMaster
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {isDriver ? 'Portal do Motorista' : isAdminOrMaster ? 'Gestão Total' : 'Operação'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 hidden sm:block">
                  {isDriver
                    ? 'Check-in Mobile & Chamada de Docas'
                    : 'Controle de Coleta, Docas & Fila'}
                </p>
              </div>
            </button>

            {/* SSE Live Status indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sseConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-[10px] font-mono">
                {sseConnected ? 'Tempo Real' : 'Conectando'}
              </span>
            </div>
          </div>

          {/* Navigation Links (VISIBILITY RESTRICTED BY USER ROLE) */}
          <nav className="hidden md:flex items-center gap-1">
            {/* DRIVER MODE: ONLY DRIVER AREA VISIBLE */}
            {isDriver ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Área do Motorista (Check-in &amp; Fila)</span>
              </div>
            ) : (
              <>
                {/* PAINEL DOCAS (VISIBLE TO COLLABORATORS AND ADMINS) */}
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === 'dashboard'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Painel Docas</span>
                  {totalWaiting > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-zinc-100 text-zinc-950">
                      {totalWaiting}
                    </span>
                  )}
                </button>

                {/* E2E - DOCAS (CHECK-IN E ROTA DO MOTORISTA) */}
                <button
                  onClick={() => setCurrentTab('driver')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentTab === 'driver'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>E2E - DOCAS</span>
                </button>

                {/* CHAT COLABORADOR <-> ADM (APENAS COM AUTORIZAÇÃO) */}
                {canUseChat && onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors relative"
                    title="Chat em tempo real entre Colaboradores das Docas e ADM"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Chat Docas</span>
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                )}

                {/* CONSULTA DE CEP (APENAS COM AUTORIZAÇÃO) */}
                {canConsultCep && onOpenCep && (
                  <button
                    onClick={onOpenCep}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
                    title="Consulta de CEP oficial e exata via ViaCEP / Correios"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Consulta CEP</span>
                  </button>
                )}

                {/* MOVIMENTAR PACOTE (APENAS COM AUTORIZAÇÃO) */}
                {canMovePackages && onOpenPackageMovement && (
                  <button
                    onClick={() => onOpenPackageMovement()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-100 hover:bg-amber-950/40 border border-amber-500/30 transition-colors shadow-xs"
                    title="Movimentar pacote para outra rota com observação e alerta por voz"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    <span>Movimentar Pacote</span>
                  </button>
                )}

                {/* QR CODE CELULAR / TOTEM */}
                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                  title="Exibir QR Code para motoristas na portaria"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Celular</span>
                </button>

                {/* PLANILHA DIÁRIA (VISIBLE ONLY IF PERMITTED OR ADMIN) */}
                {canAccessSpreadsheet && (
                  <button
                    onClick={() => setCurrentTab('sheet')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentTab === 'sheet'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Planilha Diária</span>
                  </button>
                )}

                {/* COLABORADORES & PERMISSÕES (ONLY VISIBLE FOR ADMINS AND MASTER) */}
                {canManageUsers && (
                  <button
                    onClick={() => setCurrentTab('collaborators')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentTab === 'collaborators'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Colaboradores &amp; Permissões</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right Info: Clock, User Profile, Pause Button & Dock */}
          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono text-zinc-400">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{time || '--:--:--'}</span>
            </div>

            {/* Quick Dock Pause Button (in Navbar for assigned collaborator or admin) */}
            {currentUser && myDock && (
              <div className="hidden sm:block">
                {isMyDockPaused ? (
                  <button
                    onClick={() => onToggleDockPause && onToggleDockPause(myDock.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all animate-pulse"
                    title="Clique para retomar as operações nesta doca"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Retomar Doca</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onToggleDockPause && onToggleDockPause(myDock.id, 'Pausa')}
                    disabled={myDock.status === 'calling' || myDock.status === 'occupied'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myDock.status === 'calling' || myDock.status === 'occupied'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                    }`}
                    title={
                      myDock.status === 'calling' || myDock.status === 'occupied'
                        ? 'Finalize o atendimento antes de pausar a doca'
                        : 'Pausar doca temporariamente'
                    }
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausa</span>
                  </button>
                )}
              </div>
            )}

            {/* Current Logged In User & Assigned Dock */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* DOCK CHANGER BUTTON (Only if admin or collaborator needs to change dock) */}
                <div className="relative">
                  <button
                    onClick={() => setShowDockMenu(!showDockMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-xs text-zinc-200 transition-colors"
                    title="Clique para alterar a doca onde está atuando"
                  >
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span className="font-medium text-[11px] truncate max-w-[110px]">
                      {currentUser.assignedDock || (isAdminOrMaster ? 'Todas as Docas' : 'Sem Doca')}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>

                  {showDockMenu && (
                    <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl py-1 z-50 text-xs animate-in fade-in">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-zinc-400 border-b border-zinc-900">
                        Sua Doca de Operação:
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-zinc-900">
                        {docks.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                              if (onChangeDock) onChangeDock(d.name);
                              setShowDockMenu(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-900 transition-colors ${
                              currentUser.assignedDock === d.name
                                ? 'text-zinc-100 font-semibold bg-zinc-900/50'
                                : 'text-zinc-400'
                            }`}
                          >
                            <span>{d.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {d.status === 'paused' || d.isPaused
                                ? 'Pausada'
                                : d.status === 'free'
                                ? 'Livre'
                                : d.status}
                            </span>
                          </button>
                        ))}
                        {isAdminOrMaster && (
                          <button
                            onClick={() => {
                              if (onChangeDock) onChangeDock('Administração / Todas as Docas');
                              setShowDockMenu(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-amber-300 font-medium hover:bg-zinc-900 transition-colors text-[11px]"
                          >
                            👑 Administração / Todas as Docas
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* USER BADGE */}
                <div className="hidden sm:flex flex-col items-end text-right">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                    {currentUser.isMaster ? (
                      <>
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate max-w-[130px] text-amber-200">{currentUser.name}</span>
                        <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950">
                          MASTER
                        </span>
                      </>
                    ) : currentUser.isAdmin ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</span>
                        <span className="text-[9px] font-bold uppercase font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-300">
                          ADM
                        </span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {currentUser.isMaster
                      ? currentUser.email || 'gilianocosta804@gmail.com'
                      : currentUser.isAdmin
                      ? 'Administrador Geral'
                      : currentUser.assignedDock || 'Colaborador'}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  title="Trocar Usuário / Sair para Modo Motorista"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 text-xs font-black tracking-wide transition-all shadow-md cursor-pointer"
                  title="Entrar com sua conta Gmail (gilianocosta804@gmail.com) como Usuário Master"
                >
                  <Crown className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Entrar com Gmail</span>
                </button>

                <button
                  onClick={onOpenLogin}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-750 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Colaborador / PIN</span>
                </button>
              </div>
            )}

            {/* Settings (ONLY FOR ADMINS AND MASTER) */}
            {isAdminOrMaster && (
              <button
                onClick={onOpenSettings}
                title="Configurações da Base & GPS"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors border border-zinc-800"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (STRICT ROLE VISIBILITY) */}
      <div className="md:hidden flex items-center justify-around border-t border-zinc-900 bg-zinc-950 px-2 py-2 text-[11px] overflow-x-auto">
        {isDriver ? (
          <div className="w-full flex items-center justify-between px-2 py-1 gap-2">
            <span className="text-zinc-300 font-semibold flex items-center gap-1.5 text-xs truncate">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Portal do Motorista</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenLogin}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>Gmail Master</span>
              </button>
              <button
                onClick={onOpenLogin}
                className="text-xs px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>PIN</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-around gap-1 min-w-max">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
                currentTab === 'dashboard' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Docas</span>
            </button>
            <button
              onClick={() => setCurrentTab('driver')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
                currentTab === 'driver' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>E2E - DOCAS</span>
            </button>
            {canUseChat && onOpenChat && (
              <button
                onClick={onOpenChat}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-zinc-400 hover:text-zinc-200 relative"
              >
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-0.5 right-2" />
                )}
              </button>
            )}
            {canConsultCep && onOpenCep && (
              <button
                onClick={onOpenCep}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-zinc-400 hover:text-zinc-200"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>CEP</span>
              </button>
            )}
            {canMovePackages && onOpenPackageMovement && (
              <button
                onClick={() => onOpenPackageMovement()}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-amber-400 hover:text-amber-300"
              >
                <Boxes className="w-4 h-4 text-amber-400" />
                <span>Pacotes</span>
              </button>
            )}
            {canAccessSpreadsheet && (
              <button
                onClick={() => setCurrentTab('sheet')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
                  currentTab === 'sheet' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Planilha</span>
              </button>
            )}
            {canManageUsers && (
              <button
                onClick={() => setCurrentTab('collaborators')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
                  currentTab === 'collaborators' ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuários</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal for Mobile Drivers */}
      <QRCodeTotemModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </header>
  );
};
