import React, { useState, useEffect, useCallback } from 'react';
import {
  BaseSettings,
  CallAnnouncement,
  ChatMessage,
  CollaboratorUser,
  DockConfig,
  DriverCheckIn,
  PackageMovement,
  RegisteredDriver,
} from './types';
import {
  fetchActiveCall,
  fetchChatMessages,
  fetchCheckIns,
  fetchCollaborators,
  fetchDocks,
  fetchRegisteredDrivers,
  fetchSettings,
  updateCollaborator,
  toggleDockPause,
} from './services/api';
import { Navbar } from './components/Navbar';
import { DockCallDashboard } from './components/DockCallDashboard';
import { DriverPortal } from './components/DriverPortal';
import { DailySpreadsheet } from './components/DailySpreadsheet';
import { CollaboratorsSheet } from './components/CollaboratorsSheet';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { ChatDrawer } from './components/ChatDrawer';
import { CepLookupModal } from './components/CepLookupModal';
import { PackageMovementModal } from './components/PackageMovementModal';
import {
  playCallingChime,
  sendPushNotification,
  speakAnnouncement,
  speakPackageAdded,
} from './services/sound';
import { Boxes, X, Volume2 } from 'lucide-react';

export default function App() {
  const isDriverQuery = typeof window !== 'undefined' && (
    window.location.search.includes('tab=driver') ||
    window.location.search.includes('mode=driver')
  );

  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'driver' | 'sheet' | 'collaborators' | 'settings'
  >(isDriverQuery ? 'driver' : 'dashboard');

  // Core Data
  const [checkIns, setCheckIns] = useState<DriverCheckIn[]>([]);
  const [docks, setDocks] = useState<DockConfig[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [registeredDrivers, setRegisteredDrivers] = useState<RegisteredDriver[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<CallAnnouncement | null>(null);
  const [baseSettings, setBaseSettings] = useState<BaseSettings>({
    baseName: 'Condomínio SYS Gama - Ponte Alta (Gama - DF)',
    baseLatitude: -15.9897,
    baseLongitude: -48.0536,
    allowedRadiusMeters: 500,
    enforceBaseGeofence: true,
    autoVoiceCall: true,
    soundAlerts: true,
    totalDocks: 10,
    masterGoogle: {
      connected: true,
      email: 'gilianocosta804@gmail.com',
      spreadsheetId: 'e2e_docas_sheets_master',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1E2E_Docas_Master',
      formId: 'e2e_docas_form_master',
      formUrl: 'https://docs.google.com/forms/d/1E2E_Docas_Form_Master',
      autoSync: true,
      lastSyncAt: new Date().toISOString(),
    },
  });

  // Current Logged-in User
  const [currentUser, setCurrentUser] = useState<CollaboratorUser | null>(null);

  // Chat, CEP and Package Movement State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCepModalOpen, setIsCepModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageMovementSourceRoute, setPackageMovementSourceRoute] = useState('');
  const [packageMovementAlert, setPackageMovementAlert] = useState<{
    id: string;
    targetRoute: string;
    packageCount: number;
    notes: string;
    collaboratorName: string;
  } | null>(null);

  // Connection & Modals
  const [sseConnected, setSseConnected] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Initial Load
  const loadInitialData = useCallback(async () => {
    try {
      const [
        settingsData,
        checkInsData,
        docksData,
        collabsData,
        driversData,
        activeCallData,
        chatData,
      ] = await Promise.all([
        fetchSettings().catch(() => null),
        fetchCheckIns().catch(() => []),
        fetchDocks().catch(() => []),
        fetchCollaborators().catch(() => []),
        fetchRegisteredDrivers().catch(() => []),
        fetchActiveCall().catch(() => null),
        fetchChatMessages().catch(() => []),
      ]);

      if (settingsData) setBaseSettings(settingsData);
      if (checkInsData) setCheckIns(checkInsData);
      if (docksData) setDocks(docksData);
      if (chatData) setChatMessages(chatData);
      if (collabsData) {
        setCollaborators(collabsData);
        // Default login as first admin or master if not logged in and not accessing via driver link
        if (!isDriverQuery) {
          setCurrentUser(prev => prev || collabsData.find(c => c.isMaster) || collabsData.find(c => c.isAdmin) || collabsData[0] || null);
        }
      }
      if (driversData) setRegisteredDrivers(driversData);
      if (activeCallData) setActiveAnnouncement(activeCallData);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Setup Server-Sent Events (SSE) for Real-Time synchronization
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('connected', () => {
          setSseConnected(true);
        });

        eventSource.addEventListener('new_checkin', (e: MessageEvent) => {
          const newCheckIn: DriverCheckIn = JSON.parse(e.data);
          setCheckIns(prev => {
            if (prev.some(c => c.id === newCheckIn.id)) return prev;
            return [...prev, newCheckIn];
          });
        });

        eventSource.addEventListener('driver_called', (e: MessageEvent) => {
          const announcement: CallAnnouncement = JSON.parse(e.data);
          setActiveAnnouncement(announcement);

          // Update checkins list status for called driver
          setCheckIns(prev =>
            prev.map(c =>
              c.id === announcement.id
                ? {
                    ...c,
                    status: 'called',
                    assignedDock: announcement.dockName,
                    calledAt: new Date().toISOString(),
                    callCount: (c.callCount || 0) + 1,
                  }
                : c
            )
          );

          // Play Sound & Portuguese Speech Synthesis
          playCallingChime();
          speakAnnouncement(announcement.driverName, announcement.dockName);
          sendPushNotification(
            `📢 Chamada: ${announcement.dockName}!`,
            `Motorista ${announcement.driverName}, dirija-se à ${announcement.dockName} imediatamente.`
          );
        });

        eventSource.addEventListener('checkin_updated', (e: MessageEvent) => {
          const updated: DriverCheckIn = JSON.parse(e.data);
          setCheckIns(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        });

        eventSource.addEventListener('driver_acknowledged', (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          setCheckIns(prev =>
            prev.map(c =>
              c.id === data.id
                ? { ...c, driverAcknowledgedAt: data.acknowledgedAt }
                : c
            )
          );
        });

        eventSource.addEventListener('docks_updated', (e: MessageEvent) => {
          const updatedDocks: DockConfig[] = JSON.parse(e.data);
          setDocks(updatedDocks);
        });

        eventSource.addEventListener('collaborators_updated', (e: MessageEvent) => {
          const updatedCollabs: CollaboratorUser[] = JSON.parse(e.data);
          setCollaborators(updatedCollabs);
        });

        eventSource.addEventListener('settings_updated', (e: MessageEvent) => {
          const updatedSettings: BaseSettings = JSON.parse(e.data);
          setBaseSettings(updatedSettings);
        });

        eventSource.addEventListener('chat_message', (e: MessageEvent) => {
          const newMsg: ChatMessage = JSON.parse(e.data);
          setChatMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        });

        eventSource.addEventListener('chat_cleared', () => {
          setChatMessages([]);
        });

        eventSource.addEventListener('package_moved', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            const mov: PackageMovement = data.movement;
            if (mov) {
              setPackageMovementAlert({
                id: mov.id,
                targetRoute: mov.targetRoute,
                packageCount: mov.packageCount,
                notes: mov.notes,
                collaboratorName: mov.collaboratorName,
              });
              // 1. Chime sound
              playCallingChime();
              // 2. Speak out loud ("falar que o pacote foi adicionado!")
              speakPackageAdded(mov.targetRoute, mov.notes);
              // 3. Reload data to reflect updated notes and package count
              loadInitialData();
              // Auto hide floating alert banner after 8 seconds
              setTimeout(() => {
                setPackageMovementAlert(prev => (prev?.id === mov.id ? null : prev));
              }, 8000);
            }
          } catch (err) {
            console.error('Erro ao processar evento package_moved:', err);
          }
        });

        eventSource.addEventListener('sheet_renewed', () => {
          loadInitialData();
        });

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.warn('SSE connection failed, fallback to polling:', err);
        setSseConnected(false);
      }
    };

    connectSSE();

    // Fallback polling interval every 12 seconds
    const pollInterval = setInterval(() => {
      fetchCheckIns()
        .then(res => setCheckIns(res))
        .catch(() => {});
      fetchDocks()
        .then(res => setDocks(res))
        .catch(() => {});
      fetchChatMessages()
        .then(res => setChatMessages(res))
        .catch(() => {});
    }, 12000);

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [loadInitialData]);

  // Handler to change active dock on the fly
  const handleChangeDock = async (dockName: string) => {
    if (!currentUser) return;
    try {
      const updated = await updateCollaborator(currentUser.id, { assignedDock: dockName });
      setCurrentUser(updated);
    } catch (err) {
      console.error('Erro ao trocar doca:', err);
    }
  };

  // Handler to pause/resume dock
  const handleToggleDockPause = async (dockId: string, reason?: string) => {
    try {
      const updatedDock = await toggleDockPause(dockId, currentUser?.id, reason || 'Pausa');
      setDocks(prev => prev.map(d => (d.id === updatedDock.id ? updatedDock : d)));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar pausa da doca');
    }
  };

  const totalWaiting = checkIns.filter(c => c.status === 'waiting').length;
  const canAccessSpreadsheet = Boolean(
    currentUser?.isAdmin || currentUser?.isMaster || currentUser?.permissions?.canViewSpreadsheet
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Main Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          setCurrentTab('driver');
        }}
        sseConnected={sseConnected}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        totalWaiting={totalWaiting}
        docks={docks}
        onChangeDock={handleChangeDock}
        onToggleDockPause={handleToggleDockPause}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenCep={() => setIsCepModalOpen(true)}
        onOpenPackageMovement={(source?: string) => {
          setPackageMovementSourceRoute(source || '');
          setIsPackageModalOpen(true);
        }}
        unreadChatCount={chatMessages.length}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DockCallDashboard
            checkIns={checkIns}
            docks={docks}
            baseSettings={baseSettings}
            activeAnnouncement={activeAnnouncement}
            currentUser={currentUser}
            onRefresh={loadInitialData}
            onOpenCheckIn={() => setCurrentTab('driver')}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenCep={() => setIsCepModalOpen(true)}
            onOpenPackageMovement={(source?: string) => {
              setPackageMovementSourceRoute(source || '');
              setIsPackageModalOpen(true);
            }}
          />
        )}

        {currentTab === 'driver' && (
          <DriverPortal
            checkIns={checkIns}
            baseSettings={baseSettings}
            activeAnnouncement={activeAnnouncement}
            onRefresh={loadInitialData}
            registeredDrivers={registeredDrivers}
          />
        )}

        {currentTab === 'sheet' && (
          <DailySpreadsheet
            currentCheckIns={checkIns}
            onRefresh={loadInitialData}
            isAdmin={canAccessSpreadsheet}
          />
        )}

        {currentTab === 'collaborators' && (
          <CollaboratorsSheet
            collaborators={collaborators}
            currentUser={currentUser}
            onRefresh={loadInitialData}
            onSelectUser={user => {
              setCurrentUser(user);
            }}
          />
        )}
      </main>

      {/* Footer Bar */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">E2E - DOCAS</span>
            <span>&bull; Gestão de Chamada Mobile, Conferência de Coleta &amp; Planilhas</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-zinc-200 transition-colors"
            >
              Configurações GPS ({baseSettings.allowedRadiusMeters}m)
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setIsCepModalOpen(true)}
              className="hover:text-zinc-200 transition-colors"
            >
              Consultar CEP (ViaCEP)
            </button>
            <span>&bull;</span>
            <span>Google Sheets Master: {baseSettings.masterGoogle?.email || 'gilianocosta804@gmail.com'}</span>
          </div>
        </div>
      </footer>

      {/* Floating Live Alert for Package Movement */}
      {packageMovementAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-md w-full bg-amber-950/95 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-white flex items-start gap-3 animate-in slide-in-from-top-4 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Alerta de Pacote Adicionado!
              </span>
              <button
                onClick={() => setPackageMovementAlert(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-bold text-white">
              {packageMovementAlert.packageCount} pacote(s) adicionado(s) para a rota{' '}
              <span className="font-mono text-amber-300">{packageMovementAlert.targetRoute}</span>
            </p>
            <p className="text-xs text-amber-200/90 bg-black/40 rounded-lg p-2 border border-amber-500/20 font-medium">
              &ldquo;{packageMovementAlert.notes}&rdquo;
            </p>
            <p className="text-[10px] text-zinc-400">
              Operador: {packageMovementAlert.collaboratorName}
            </p>
          </div>
        </div>
      )}

      {/* Package Movement & Transfer Modal */}
      <PackageMovementModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        currentUser={currentUser}
        activeCheckIns={checkIns}
        defaultSourceRoute={packageMovementSourceRoute}
        onMovementRecorded={() => loadInitialData()}
      />

      {/* Real-Time Chat Drawer between Dock Collaborator and ADM */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        docks={docks}
        messages={chatMessages}
        onNewMessageSent={msg => setChatMessages(prev => [...prev, msg])}
      />

      {/* Exact Official CEP Lookup Modal */}
      <CepLookupModal
        isOpen={isCepModalOpen}
        onClose={() => setIsCepModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        settings={baseSettings}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={updated => setBaseSettings(updated)}
        isAdmin={Boolean(currentUser?.isAdmin || currentUser?.isMaster)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        collaborators={collaborators}
        docks={docks}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setCurrentTab('dashboard');
        }}
      />
    </div>
  );
}
