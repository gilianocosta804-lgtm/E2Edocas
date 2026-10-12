import React, { useState } from 'react';
import {
  Truck,
  PhoneCall,
  Flame,
  CheckCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  Volume2,
  Users,
  Building2,
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  Smartphone,
  Radio,
  Plus,
  Trash2,
  Package,
  Tag,
  Boxes,
  Lock,
  ShieldCheck,
  Crown,
  QrCode,
  Pause,
  Coffee,
  MessageSquare,
} from 'lucide-react';
import { QRCodeTotemModal } from './QRCodeTotemModal';
import {
  BaseSettings,
  CallAnnouncement,
  CheckInStatus,
  CollaboratorUser,
  DockConfig,
  DriverCheckIn,
} from '../types';
import {
  addDock,
  callDriverToDock,
  deleteDock,
  recordCollection,
  toggleDockMaintenance,
  toggleDockPause,
  updateCheckInStatus,
} from '../services/api';
import { playCallingChime, speakAnnouncement } from '../services/sound';

interface DockCallDashboardProps {
  checkIns: DriverCheckIn[];
  docks: DockConfig[];
  baseSettings: BaseSettings;
  activeAnnouncement: CallAnnouncement | null;
  currentUser: CollaboratorUser | null;
  onRefresh: () => void;
  onOpenCheckIn: () => void;
  onOpenChat?: () => void;
  onOpenCep?: () => void;
  onOpenPackageMovement?: (defaultSourceRoute?: string) => void;
}

export const DockCallDashboard: React.FC<DockCallDashboardProps> = ({
  checkIns,
  docks,
  baseSettings,
  activeAnnouncement,
  currentUser,
  onRefresh,
  onOpenCheckIn,
  onOpenChat,
  onOpenCep,
  onOpenPackageMovement,
}) => {
  // Permission verification: only Master and 4 Admins have access to ALL docks
  const hasAllDocksAccess = Boolean(currentUser?.isMaster || currentUser?.isAdmin);
  const userAssignedDock = currentUser?.assignedDock || '';

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'called' | 'at_dock'>('all');
  const [selectedDockForCall, setSelectedDockForCall] = useState<string>('');
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [targetCheckIn, setTargetCheckIn] = useState<DriverCheckIn | null>(null);
  const [isAddingDock, setIsAddingDock] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [dockViewFilter, setDockViewFilter] = useState<'all' | 'my_dock'>('all');

  // Collection (Pacotes & Isca) Modal State
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionTarget, setCollectionTarget] = useState<DriverCheckIn | null>(null);
  const [packageCountInput, setPackageCountInput] = useState<string>('');
  const [iscaNumberInput, setIscaNumberInput] = useState<string>('');
  const [savingCollection, setSavingCollection] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  // Statistics counters
  const totalToday = checkIns.length;
  const waitingCount = checkIns.filter(c => c.status === 'waiting').length;
  const callingCount = checkIns.filter(c => c.status === 'called').length;
  const inDockCount = checkIns.filter(c => c.status === 'at_dock').length;
  const completedCount = checkIns.filter(c => c.status === 'completed').length;
  const priorityCount = checkIns.filter(c => c.isPriority && c.status === 'waiting').length;
  const totalPackagesToday = checkIns.reduce((sum, c) => sum + (c.packageCount || 0), 0);

  // Filtered queue in arrival order
  const filteredQueue = checkIns
    .filter(item => {
      if (statusFilter === 'waiting') return item.status === 'waiting';
      if (statusFilter === 'called') return item.status === 'called';
      if (statusFilter === 'at_dock') return item.status === 'at_dock';
      return true;
    })
    .filter(item => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.driverName.toLowerCase().includes(q) ||
        item.licensePlate.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        String(item.ticketNumber).includes(q) ||
        (item.iscaNumber && item.iscaNumber.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const statusWeight = (s: CheckInStatus) =>
        s === 'called' ? 0 : s === 'waiting' ? 1 : s === 'at_dock' ? 2 : 3;
      if (statusWeight(a.status) !== statusWeight(b.status)) {
        return statusWeight(a.status) - statusWeight(b.status);
      }
      return a.ticketNumber - b.ticketNumber;
    });

  // Call next in queue
  // If collaborator: only to their own dock
  // If admin/master: to first available free dock across all docks
  const handleCallNextSmart = async () => {
    let targetDockName: string;

    if (!hasAllDocksAccess) {
      if (!userAssignedDock) {
        alert('Você não tem uma doca associada. Por favor, selecione sua doca no topo.');
        return;
      }
      const myDock = docks.find(d => d.name.toLowerCase() === userAssignedDock.toLowerCase());
      if (!myDock) {
        alert(`Doca ${userAssignedDock} não encontrada no pátio.`);
        return;
      }
      if (myDock.status === 'paused' || myDock.isPaused) {
        alert(
          `Sua doca (${userAssignedDock}) está temporariamente em PAUSA. Clique no botão 'Retomar Doca' para voltar ao atendimento antes de chamar o próximo motorista.`
        );
        return;
      }
      if (myDock.status !== 'free') {
        alert(
          `Sua doca (${userAssignedDock}) não está livre no momento (Status: ${
            myDock.status === 'calling'
              ? 'Chamando motorista'
              : myDock.status === 'occupied'
              ? 'Em carregamento'
              : myDock.status
          }). Conclua ou libere a doca antes de chamar o próximo.`
        );
        return;
      }
      targetDockName = myDock.name;
    } else {
      const freeDock = docks.find(d => d.status === 'free' && !d.isPaused);
      if (!freeDock) {
        alert('Todas as docas estão ocupadas, em pausa ou em manutenção no momento.');
        return;
      }
      targetDockName = freeDock.name;
    }

    const priorityWaiting = checkIns.find(c => c.status === 'waiting' && c.isPriority);
    const regularWaiting = checkIns.find(c => c.status === 'waiting');
    const nextDriver = priorityWaiting || regularWaiting;

    if (!nextDriver) {
      alert('Não há motoristas aguardando na fila.');
      return;
    }

    try {
      await callDriverToDock(
        nextDriver.id,
        targetDockName,
        currentUser?.name || 'Operador',
        currentUser?.id
      );
      playCallingChime();
      speakAnnouncement(nextDriver.driverName, targetDockName);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao chamar motorista: ' + err.message);
    }
  };

  // Call specifically to a given dock
  const handleCallToDock = async (dock: DockConfig) => {
    if (!hasAllDocksAccess && dock.name.toLowerCase() !== userAssignedDock.toLowerCase()) {
      alert(
        `Acesso restrito: você só tem permissão para operar e chamar para a sua própria doca (${userAssignedDock}). Apenas os 4 administradores e o usuário master têm acesso a todas as docas.`
      );
      return;
    }

    if (dock.status === 'paused' || dock.isPaused) {
      alert(
        `A ${dock.name} está em PAUSA (${dock.pausedReason || 'Doca pausada'}). Clique em 'Retomar Doca' para reativar o atendimento antes de chamar um veículo.`
      );
      return;
    }

    if (dock.status !== 'free') {
      alert(`A ${dock.name} não está livre no momento.`);
      return;
    }

    const priorityWaiting = checkIns.find(c => c.status === 'waiting' && c.isPriority);
    const regularWaiting = checkIns.find(c => c.status === 'waiting');
    const nextDriver = priorityWaiting || regularWaiting;

    if (!nextDriver) {
      alert('Não há motoristas aguardando na fila.');
      return;
    }

    try {
      await callDriverToDock(
        nextDriver.id,
        dock.name,
        currentUser?.name || 'Operador',
        currentUser?.id
      );
      playCallingChime();
      speakAnnouncement(nextDriver.driverName, dock.name);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao chamar motorista: ' + err.message);
    }
  };

  // Pause or Resume a dock (Pausa temporária)
  const handleTogglePause = async (dock: DockConfig, reason?: string) => {
    if (!hasAllDocksAccess && dock.name.toLowerCase() !== userAssignedDock.toLowerCase()) {
      alert(
        `Acesso negado: como colaborador, você só pode pausar ou retomar a sua própria doca (${userAssignedDock}). Apenas administradores e o usuário master controlam todas as docas.`
      );
      return;
    }

    try {
      setIsPausing(true);
      await toggleDockPause(dock.id, currentUser?.id, reason || 'Pausa');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar pausa da doca');
    } finally {
      setIsPausing(false);
    }
  };

  const openCallModal = (checkIn: DriverCheckIn) => {
    setTargetCheckIn(checkIn);
    if (!hasAllDocksAccess) {
      // Locked to own dock
      setSelectedDockForCall(userAssignedDock || docks[0]?.name || 'Doca 01');
    } else {
      const firstFree = docks.find(d => d.status === 'free' && !d.isPaused);
      setSelectedDockForCall(firstFree ? firstFree.name : docks[0]?.name || 'Doca 01');
    }
    setIsCallingModalOpen(true);
  };

  const handleExecuteCall = async () => {
    if (!targetCheckIn || !selectedDockForCall) return;

    if (!hasAllDocksAccess && selectedDockForCall.toLowerCase() !== userAssignedDock.toLowerCase()) {
      alert(
        `Acesso restrito: você só tem permissão para chamar para a sua própria doca (${userAssignedDock}). Apenas administradores e o usuário master gerenciam todas as docas.`
      );
      return;
    }

    const targetDockObj = docks.find(d => d.name.toLowerCase() === selectedDockForCall.toLowerCase());
    if (targetDockObj && (targetDockObj.status === 'paused' || targetDockObj.isPaused)) {
      alert(
        `A ${targetDockObj.name} está temporariamente em PAUSA (${targetDockObj.pausedReason || 'Doca pausada'}). Clique em 'Retomar Doca' antes de chamar um motorista.`
      );
      return;
    }

    try {
      await callDriverToDock(
        targetCheckIn.id,
        selectedDockForCall,
        currentUser?.name || 'Operador',
        currentUser?.id
      );
      playCallingChime();
      speakAnnouncement(targetCheckIn.driverName, selectedDockForCall);
      setIsCallingModalOpen(false);
      setTargetCheckIn(null);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao chamar: ' + err.message);
    }
  };

  const handleRepeatCall = (checkIn: DriverCheckIn) => {
    if (!checkIn.assignedDock) return;
    playCallingChime();
    speakAnnouncement(checkIn.driverName, checkIn.assignedDock);
  };

  const handleStatusChange = async (checkInId: string, status: CheckInStatus) => {
    try {
      await updateCheckInStatus(checkInId, status);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  // Open Collection Modal
  const openCollectionModal = (checkIn: DriverCheckIn) => {
    setCollectionTarget(checkIn);
    setPackageCountInput(
      checkIn.packageCount !== null && checkIn.packageCount !== undefined
        ? String(checkIn.packageCount)
        : ''
    );
    setIscaNumberInput(checkIn.iscaNumber || '');
    setIsCollectionModalOpen(true);
  };

  // Save Collection data (pacotes & isca)
  const handleSaveCollection = async (shouldComplete = false) => {
    if (!collectionTarget) return;

    const count = parseInt(packageCountInput, 10);
    if (isNaN(count) || count < 0) {
      alert('Por favor, informe a quantidade válida de pacotes carregados.');
      return;
    }

    setSavingCollection(true);
    try {
      await recordCollection(collectionTarget.id, {
        packageCount: count,
        iscaNumber: iscaNumberInput.trim() || null,
        collectorName: currentUser?.name || 'Colaborador',
        collectorDock: currentUser?.assignedDock || collectionTarget.assignedDock || null,
      });

      if (shouldComplete) {
        await updateCheckInStatus(collectionTarget.id, 'completed');
      }

      setIsCollectionModalOpen(false);
      setCollectionTarget(null);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao registrar coleta: ' + err.message);
    } finally {
      setSavingCollection(false);
    }
  };

  const handleAddDock = async () => {
    if (!hasAllDocksAccess) {
      alert('Apenas os 4 Administradores e o Usuário Master podem adicionar docas.');
      return;
    }
    setIsAddingDock(true);
    try {
      await addDock();
      onRefresh();
    } catch (err: any) {
      alert('Erro ao adicionar doca: ' + err.message);
    } finally {
      setIsAddingDock(false);
    }
  };

  const handleDeleteDock = async (dockId: string, dockName: string) => {
    if (!hasAllDocksAccess) {
      alert('Apenas os 4 Administradores e o Usuário Master podem remover docas.');
      return;
    }
    const confirmed = window.confirm(`Deseja remover a ${dockName} do pátio?`);
    if (!confirmed) return;
    try {
      await deleteDock(dockId);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao remover doca: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Chegadas Hoje
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{totalToday}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Veículos no pátio</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>Na Fila</span>
            {priorityCount > 0 && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {priorityCount} Prio
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{waitingCount}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Aguardando chamada</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
            Em Chamada
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">{callingCount}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Sinal mobile enviado</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-300">
            Nas Docas
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1 font-mono">{inDockCount}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Carregando</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
            Finalizados
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{completedCount}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Cargas liberadas</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1">
            <Boxes className="w-3 h-3 text-zinc-400" />
            <span>Total Pacotes</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1 font-mono">{totalPackagesToday}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Coletados hoje</div>
        </div>
      </div>

      {/* ACCESS LEVEL NOTICE BANNER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {hasAllDocksAccess ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center text-amber-400 shrink-0">
              {currentUser?.isMaster ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-semibold text-white">
                Controle Geral ({currentUser?.isMaster ? 'Usuário Master' : 'Administrador Geral'}):
              </span>
              <span className="text-zinc-400 ml-1.5">
                Você tem permissão total para chamar motoristas e gerenciar <strong>todas as {docks.length} docas</strong> simultaneamente.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center text-zinc-300 shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <span className="font-semibold text-white">
                Modo Colaborador de Doca ({currentUser?.name}):
              </span>
              <span className="text-zinc-400 ml-1.5">
                Acesso restrito à sua própria doca: <strong className="text-zinc-200">{userAssignedDock || 'Doca não definida'}</strong>. Apenas os 4 administradores e o usuário master têm acesso a todas as docas.
              </span>
            </div>
          </div>
        )}

        <div className="text-[11px] font-mono text-zinc-400 shrink-0">
          Doca Ativa: <span className="text-zinc-200 font-semibold">{userAssignedDock || 'Geral'}</span>
        </div>
      </div>

      {/* ACTIVE CALL BANNER */}
      {activeAnnouncement && (
        <div className="bg-zinc-900 border border-zinc-750 rounded-2xl p-4 sm:p-5 text-zinc-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-300 mb-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Chamada Ativa no Celular</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {activeAnnouncement.driverName} &rarr;{' '}
                <span className="font-mono text-zinc-100 bg-zinc-800 px-2.5 py-0.5 rounded-md ml-1">
                  {activeAnnouncement.dockName}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Senha #{String(activeAnnouncement.ticketNumber).padStart(3, '0')} &bull; Rota:{' '}
                {activeAnnouncement.route} ({activeAnnouncement.city}) &bull; Sinal emitido às{' '}
                {activeAnnouncement.calledAtFormatted}
              </p>

              {/* Driver Mobile Confirmation Status */}
              <div className="mt-2 text-xs flex items-center gap-2">
                {checkIns.find(c => c.id === activeAnnouncement.id)?.driverAcknowledgedAt ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Motorista confirmou sinal no celular (a caminho)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800 text-[11px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Sinal emitido no celular &bull; Aguardando confirmação do motorista
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playCallingChime();
                speakAnnouncement(activeAnnouncement.driverName, activeAnnouncement.dockName);
              }}
              className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Reenviar Sinal</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCKS GRID (VISÃO GERAL DAS DOCAS) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Status das Docas ({docks.length} Docas Operacionais)
            </h3>
            <p className="text-xs text-zinc-400">
              {hasAllDocksAccess
                ? 'Controle total de todas as docas (Administradores / Master)'
                : `Você só pode chamar para a sua própria doca (${userAssignedDock || 'Doca não definida'})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* CHAT DOCA <-> ADM */}
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="px-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 hover:text-blue-100 text-xs font-semibold border border-blue-500/40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Abrir Chat em tempo real entre Operadores da Doca e ADM"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Chat Docas &amp; ADM</span>
              </button>
            )}

            {/* CONSULTA CEP */}
            {onOpenCep && (
              <button
                onClick={onOpenCep}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Consultar CEP oficial e exata via ViaCEP / Correios"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Consulta CEP</span>
              </button>
            )}

            {/* MOVIMENTAR PACOTE */}
            {onOpenPackageMovement && (
              <button
                onClick={() => onOpenPackageMovement()}
                className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 hover:text-amber-100 text-xs font-semibold border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Movimentar pacote para outra rota, colocar observação e emitir alerta por voz"
              >
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                <span>Movimentar Pacote</span>
              </button>
            )}

            {/* QR CODE CELULAR / TOTEM PORTARIA BUTTON */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-750 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exibir QR Code para motoristas no celular (Modo Totem / Guarita)"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR Code Celular</span>
            </button>

            {/* ADD DOCK ONLY FOR ADMINS AND MASTER */}
            {hasAllDocksAccess && (
              <button
                onClick={handleAddDock}
                disabled={isAddingDock}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-750 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Adicionar mais uma doca ao pátio (Apenas Administradores / Master)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingDock ? 'Adicionando...' : '+ Adicionar Doca'}</span>
              </button>
            )}

            <button
              onClick={handleCallNextSmart}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {hasAllDocksAccess
                  ? 'Chamar Próximo (Qualquer Doca Livre)'
                  : `Chamar Próximo para ${userAssignedDock || 'Minha Doca'}`}
              </span>
            </button>

            <button
              onClick={onOpenCheckIn}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
            >
              + Novo Check-in
            </button>
          </div>
        </div>

        {/* COLLABORATOR DEDICATED DOCK BAR & QUICK PAUSE/RESUME */}
        {!hasAllDocksAccess && userAssignedDock && (
          <div className="bg-zinc-900/90 border border-zinc-750 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              {(() => {
                const myDockObj = docks.find(
                  d => d.name.toLowerCase() === userAssignedDock.toLowerCase()
                );
                const isMyDockPaused = myDockObj?.status === 'paused' || myDockObj?.isPaused;
                return (
                  <>
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                        isMyDockPaused
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          : myDockObj?.status === 'calling'
                          ? 'bg-amber-500/20 text-amber-300 animate-pulse border-amber-500/30'
                          : myDockObj?.status === 'occupied'
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {userAssignedDock.replace(/[^0-9]/g, '') || '01'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{userAssignedDock}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wide border ${
                            isMyDockPaused
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : myDockObj?.status === 'free'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : myDockObj?.status === 'calling'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {isMyDockPaused
                            ? '⏸️ Em Pausa'
                            : myDockObj?.status === 'free'
                            ? '✅ Livre para Atendimento'
                            : myDockObj?.status === 'calling'
                            ? '📞 Chamando Motorista'
                            : '📦 Em Carregamento'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Operador: <span className="text-zinc-200 font-medium">{currentUser?.name}</span> &bull; Apenas você e os administradores podem operar esta doca.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* QUICK PAUSE / RESUME ACTION BUTTON */}
            {(() => {
              const myDockObj = docks.find(
                d => d.name.toLowerCase() === userAssignedDock.toLowerCase()
              );
              const isMyDockPaused = myDockObj?.status === 'paused' || myDockObj?.isPaused;

              if (!myDockObj) return null;

              return (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  {isMyDockPaused ? (
                    <button
                      onClick={() => handleTogglePause(myDockObj)}
                      disabled={isPausing}
                      className="w-full md:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Retomar Doca</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePause(myDockObj, 'Pausa')}
                      disabled={
                        isPausing ||
                        myDockObj.status === 'calling' ||
                        myDockObj.status === 'occupied'
                      }
                      className={`w-full md:w-auto px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                        myDockObj.status === 'calling' || myDockObj.status === 'occupied'
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                      }`}
                      title={
                        myDockObj.status === 'calling' || myDockObj.status === 'occupied'
                          ? 'Finalize a operação antes de pausar a doca'
                          : 'Pausar doca temporariamente'
                      }
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>⏸️ Pausar Doca</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* COLLABORATOR DOCK VIEW TOGGLE (SEPARA A DOCA DO COLABORADOR DAS DEMAIS) */}
        {!hasAllDocksAccess && userAssignedDock && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Visualização:</span>
              <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                <button
                  onClick={() => setDockViewFilter('all')}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    dockViewFilter === 'all'
                      ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todas as Docas ({docks.length})
                </button>
                <button
                  onClick={() => setDockViewFilter('my_dock')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    dockViewFilter === 'my_dock'
                      ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>📍 Apenas Minha Doca ({userAssignedDock})</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Apenas os 4 administradores e o usuário master têm acesso a todas as docas.</span>
            </div>
          </div>
        )}

        {/* DOCKS TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {docks
            .filter(dock => {
              if (dockViewFilter === 'my_dock' && !hasAllDocksAccess && userAssignedDock) {
                return dock.name.toLowerCase() === userAssignedDock.toLowerCase();
              }
              return true;
            })
            .map(dock => {
            const isPaused = dock.status === 'paused' || dock.isPaused;
            const isFree = dock.status === 'free' && !isPaused;
            const isCalling = dock.status === 'calling';
            const isOccupied = dock.status === 'occupied';
            const isMaintenance = dock.status === 'maintenance';
            const isMyDock = Boolean(
              userAssignedDock && dock.name.toLowerCase() === userAssignedDock.toLowerCase()
            );
            const canOperateThisDock = hasAllDocksAccess || isMyDock;

            const currentCheckIn = checkIns.find(c => c.id === dock.currentCheckInId);

            return (
              <div
                key={dock.id}
                className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                  isMyDock ? 'ring-1 ring-zinc-400 bg-zinc-900/90' : ''
                } ${
                  !canOperateThisDock ? 'opacity-70 bg-zinc-950/40 border-zinc-900' : ''
                } ${
                  isPaused
                    ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                    : canOperateThisDock && isFree
                    ? 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700'
                    : canOperateThisDock && isCalling
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : canOperateThisDock && isOccupied
                    ? 'bg-zinc-900/80 border-zinc-700'
                    : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-white">{dock.name}</span>
                      {isMyDock && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-950 font-bold">
                          Sua Doca
                        </span>
                      )}
                      {!hasAllDocksAccess && !isMyDock && (
                        <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-0.5" title="Restrito aos administradores ou ao operador desta doca">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isPaused
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isFree
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isCalling
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : isOccupied
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {isPaused
                        ? '⏸️ Pausada'
                        : isFree
                        ? 'Livre'
                        : isCalling
                        ? 'Chamando'
                        : isOccupied
                        ? 'Carregando'
                        : 'Manutenção'}
                    </span>
                  </div>

                  {/* Dock Driver Info or Paused Info */}
                  {isPaused ? (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-xs">
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausa</span>
                      </div>
                      <p className="text-[10px] text-amber-400/80">
                        {dock.pausedReason || 'Doca pausada temporariamente'}
                      </p>
                      {dock.pausedAt && (
                        <div className="text-[9px] text-amber-400/60 font-mono">
                          Pausada às {new Date(dock.pausedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ) : dock.currentDriverName ? (
                    <div className="mt-2.5 space-y-1">
                      <div className="font-semibold text-xs text-white truncate" title={dock.currentDriverName}>
                        {dock.currentDriverName}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                        <span>Senha #{String(dock.currentTicketNumber).padStart(2, '0')}</span>
                        <span>&bull;</span>
                        <span className="font-mono font-bold text-amber-300 bg-zinc-800 px-1 py-0.2 rounded text-[10px]">
                          {dock.currentRoute}
                        </span>
                      </div>

                      {/* Package & Bait display on dock tile */}
                      {currentCheckIn && (
                        <div className="mt-1 pt-1.5 border-t border-zinc-800/80 text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between text-zinc-300 font-mono">
                            <span className="text-zinc-500">Pacotes:</span>
                            <span className="font-semibold">
                              {currentCheckIn.packageCount !== null && currentCheckIn.packageCount !== undefined
                                ? `${currentCheckIn.packageCount} un`
                                : 'Pendente'}
                            </span>
                          </div>
                          {currentCheckIn.iscaNumber && (
                            <div className="flex items-center justify-between text-zinc-300 font-mono">
                              <span className="text-zinc-500">Isca:</span>
                              <span className="font-semibold">{currentCheckIn.iscaNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 text-[11px] text-zinc-500 italic">Disponível para chamada</div>
                  )}
                </div>

                {/* Dock Actions */}
                <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between gap-1">
                  {isPaused ? (
                    <div className="flex items-center gap-1 w-full">
                      {canOperateThisDock ? (
                        <button
                          onClick={() => handleTogglePause(dock)}
                          disabled={isPausing}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          title="Clique para retomar as operações nesta doca"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Retomar Doca</span>
                        </button>
                      ) : (
                        <span className="flex-1 text-center text-[10px] text-amber-400/80 font-mono py-1">
                          ⏸️ Pausa
                        </span>
                      )}
                    </div>
                  ) : isFree ? (
                    <div className="flex items-center gap-1 w-full">
                      {canOperateThisDock ? (
                        <>
                          <button
                            onClick={() => handleCallToDock(dock)}
                            className="flex-1 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium border border-zinc-800 transition-colors"
                          >
                            Chamar Aqui
                          </button>
                          <button
                            onClick={() => handleTogglePause(dock, 'Pausa')}
                            disabled={isPausing}
                            title="Pausar doca temporariamente"
                            className="px-2 py-1 rounded bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[10px] font-medium transition-colors flex items-center gap-1"
                          >
                            <Pause className="w-3 h-3" />
                            <span className="hidden sm:inline">Pausa</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className="flex-1 py-1 rounded bg-zinc-950 text-zinc-600 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-not-allowed border border-zinc-900"
                          title={`Você só pode chamar para a sua doca (${userAssignedDock}).`}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Restrito</span>
                        </span>
                      )}

                      {/* Delete dock button only for admins/master */}
                      {hasAllDocksAccess && docks.length > 1 && (
                        <button
                          onClick={() => handleDeleteDock(dock.id, dock.name)}
                          title={`Remover ${dock.name}`}
                          className="p-1 rounded bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-850 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : isCalling ? (
                    <div className="flex items-center gap-1 w-full">
                      {canOperateThisDock ? (
                        <>
                          <button
                            onClick={() => {
                              if (currentCheckIn) {
                                handleStatusChange(currentCheckIn.id, 'at_dock');
                              }
                            }}
                            className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                          >
                            Encostou
                          </button>
                          <button
                            onClick={() => {
                              if (currentCheckIn) handleRepeatCall(currentCheckIn);
                            }}
                            title="Reenviar sinal sonoro"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="flex-1 text-center text-[10px] text-zinc-600 font-mono py-1">
                          Em chamada ({dock.name})
                        </span>
                      )}
                    </div>
                  ) : isOccupied ? (
                    <div className="flex items-center gap-1 w-full">
                      {canOperateThisDock ? (
                        <>
                          <button
                            onClick={() => {
                              if (currentCheckIn) openCollectionModal(currentCheckIn);
                            }}
                            className="flex-1 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-[11px] font-medium border border-zinc-750 transition-colors flex items-center justify-center gap-1"
                            title="Preencher pacotes carregados e número da isca"
                          >
                            <Package className="w-3 h-3 text-zinc-400" />
                            <span>Coleta</span>
                          </button>
                          {onOpenPackageMovement && (
                            <button
                              onClick={() => {
                                onOpenPackageMovement(
                                  currentCheckIn?.route
                                    ? `Doca ${dock.number} (${currentCheckIn.route})`
                                    : dock.name
                                );
                              }}
                              className="px-1.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] transition-colors"
                              title="Movimentar pacote para outra rota com alerta por voz"
                            >
                              <Boxes className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (currentCheckIn) {
                                if (
                                  currentCheckIn.packageCount === null ||
                                  currentCheckIn.packageCount === undefined
                                ) {
                                  openCollectionModal(currentCheckIn);
                                } else {
                                  handleStatusChange(currentCheckIn.id, 'completed');
                                }
                              }
                            }}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                            title="Liberar Doca"
                          >
                            Liberar
                          </button>
                        </>
                      ) : (
                        <span className="flex-1 text-center text-[10px] text-zinc-600 font-mono py-1">
                          Carregando ({dock.name})
                        </span>
                      )}
                    </div>
                  ) : (
                    hasAllDocksAccess && (
                      <button
                        onClick={() => toggleDockMaintenance(dock.id)}
                        className="w-full py-1 rounded bg-zinc-900 text-zinc-400 text-[11px]"
                      >
                        Reativar Doca
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILA DE CHEGADA */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              Fila em Ordem de Chegada
            </h3>
            <p className="text-xs text-zinc-400">
              Ordem cronológica com verificação de presença, conferência de pacotes e número da isca
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar motorista, placa, rota..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 w-48 sm:w-60 focus:outline-none focus:border-zinc-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2 pointer-events-none" />
            </div>

            <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'waiting' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                }`}
              >
                Fila ({waitingCount})
              </button>
              <button
                onClick={() => setStatusFilter('called')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'called' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                }`}
              >
                Chamados ({callingCount})
              </button>
              <button
                onClick={() => setStatusFilter('at_dock')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'at_dock' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                }`}
              >
                Docas ({inDockCount})
              </button>
            </div>
          </div>
        </div>

        {/* QUEUE TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-850">
              <tr>
                <th className="p-3">Senha</th>
                <th className="p-3">Motorista</th>
                <th className="p-3">Rota / Cidade</th>
                <th className="p-3">Chegada</th>
                <th className="p-3">Prioridade</th>
                <th className="p-3">Presença GPS</th>
                <th className="p-3">Doca</th>
                <th className="p-3">Coleta (Pacotes / Isca)</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-200">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-500">
                    Nenhum motorista encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredQueue.map(item => {
                  const isWaiting = item.status === 'waiting';
                  const isCalled = item.status === 'called';
                  const isAtDock = item.status === 'at_dock';
                  const isCompleted = item.status === 'completed';

                  const isItemAtMyDock = Boolean(
                    userAssignedDock &&
                      item.assignedDock &&
                      item.assignedDock.toLowerCase() === userAssignedDock.toLowerCase()
                  );
                  const canOperateThisItem = hasAllDocksAccess || isItemAtMyDock || (isWaiting && Boolean(userAssignedDock));

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-900/50 transition-colors ${
                        isCalled
                          ? 'bg-amber-950/10'
                          : item.isPriority && isWaiting
                          ? 'bg-amber-950/5'
                          : ''
                      }`}
                    >
                      {/* TICKET # */}
                      <td className="p-3">
                        <span className="font-mono font-bold text-xs text-zinc-200">
                          #{String(item.ticketNumber).padStart(3, '0')}
                        </span>
                      </td>

                      {/* DRIVER NAME */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-white text-xs">{item.driverName}</span>
                          {item.isManualRegistration && (
                            <span
                              title="Motorista com entrada manual"
                              className="px-1 py-0.2 rounded bg-zinc-850 text-amber-400 border border-amber-500/20 text-[9px] font-mono"
                            >
                              Manual
                            </span>
                          )}
                        </div>
                        {item.licensePlate && (
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Placa: {item.licensePlate}
                          </div>
                        )}
                      </td>

                      {/* ROUTE & CITY */}
                      <td className="p-3">
                        <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 font-mono font-bold text-amber-300 text-xs">
                          {item.route}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{item.city}</div>
                      </td>

                      {/* ARRIVAL TIME */}
                      <td className="p-3 text-zinc-300 font-mono text-[11px]">
                        {item.arrivalTime}
                      </td>

                      {/* PRIORITY */}
                      <td className="p-3">
                        {item.isPriority ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold">
                            PRIORIDADE
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Normal</span>
                        )}
                      </td>

                      {/* GPS STATUS */}
                      <td className="p-3">
                        {item.locationStatus === 'validated_base' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                            <MapPin className="w-3 h-3" />
                            <span>Na Base ({item.distanceToBaseMeters}m)</span>
                          </span>
                        ) : item.locationStatus === 'outside_base' ? (
                          <span
                            title={`Distância: ${item.distanceToBaseMeters}m`}
                            className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Fora ({( (item.distanceToBaseMeters || 0) / 1000).toFixed(1)}km)</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Sem GPS</span>
                        )}
                      </td>

                      {/* ASSIGNED DOCK */}
                      <td className="p-3">
                        {item.assignedDock ? (
                          <span className="font-mono font-medium text-zinc-100 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {item.assignedDock}
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* COLLECTION DATA (PACOTES & ISCA) */}
                      <td className="p-3">
                        {item.packageCount !== null && item.packageCount !== undefined ? (
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <div className="text-zinc-200 font-semibold flex items-center gap-1">
                              <Package className="w-3 h-3 text-zinc-400" />
                              <span>{item.packageCount} pacotes</span>
                            </div>
                            {item.iscaNumber && (
                              <div className="text-zinc-400 text-[10px] flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-zinc-500" />
                                <span>Isca: {item.iscaNumber}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openCollectionModal(item)}
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[11px] transition-colors"
                          >
                            + Informar Coleta
                          </button>
                        )}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                            isWaiting
                              ? 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              : isCalled
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isAtDock
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          {isWaiting
                            ? 'Aguardando'
                            : isCalled
                            ? item.driverAcknowledgedAt
                              ? 'Confirmado'
                              : 'Chamando'
                            : isAtDock
                            ? 'Na Doca'
                            : isCompleted
                            ? 'Finalizado'
                            : item.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isWaiting && (
                            <button
                              onClick={() => openCallModal(item)}
                              className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1 transition-colors"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>
                                {hasAllDocksAccess
                                  ? 'Chamar'
                                  : `Chamar p/ ${userAssignedDock || 'Doca'}`}
                              </span>
                            </button>
                          )}

                          {isCalled && (
                            <>
                              <button
                                onClick={() => handleRepeatCall(item)}
                                title="Repetir Sinal"
                                className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              {(hasAllDocksAccess || isItemAtMyDock) && (
                                <button
                                  onClick={() => handleStatusChange(item.id, 'at_dock')}
                                  className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                                >
                                  Encostou
                                </button>
                              )}
                            </>
                          )}

                          {isAtDock && (
                            <button
                              onClick={() => openCollectionModal(item)}
                              className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1"
                            >
                              <Package className="w-3 h-3" />
                              <span>Coleta / Liberar</span>
                            </button>
                          )}

                          {isWaiting && hasAllDocksAccess && (
                            <button
                              onClick={() => handleStatusChange(item.id, 'absent')}
                              title="Marcar como Ausente"
                              className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-900"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECTION MODAL (PACOTES & ISCA) */}
      {isCollectionModalOpen && collectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">
                    Registro de Coleta na Doca
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Conferência de pacotes e número de isca da carga
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target driver summary */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Motorista:</span>
                <span className="font-semibold text-white">{collectionTarget.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Placa:</span>
                <span className="font-mono text-zinc-200">{collectionTarget.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Doca de Atendimento:</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {currentUser?.assignedDock || collectionTarget.assignedDock || 'Doca Operacional'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Conferente / Colaborador:</span>
                <span className="text-zinc-200">{currentUser?.name || 'Operador'}</span>
              </div>
            </div>

            {/* Collection form inputs */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-200 mb-1 flex items-center justify-between">
                  <span>Quantidade de Pacotes Carregados *</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Obrigatório</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="Ex: 85"
                  value={packageCountInput}
                  onChange={e => setPackageCountInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Total de volumes/pacotes conferidos e alocados no veículo.
                </p>
              </div>

              <div>
                <label className="block font-medium text-zinc-200 mb-1 flex items-center justify-between">
                  <span>Número da Isca de Carga</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Quando necessário</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: ISCA-44912 (opcional)"
                  value={iscaNumberInput}
                  onChange={e => setIscaNumberInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-zinc-400"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Número de rastreamento da isca eletrônica inserida na carga, se houver.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={savingCollection}
                onClick={() => handleSaveCollection(true)}
                className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Salvar Coleta e Liberar Doca</span>
              </button>

              <button
                type="button"
                disabled={savingCollection}
                onClick={() => handleSaveCollection(false)}
                className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-800 transition-colors cursor-pointer"
              >
                Apenas Salvar Dados (Continuar Carregando)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALL MODAL (ENFORCES DOCK ACCESS RESTRICTION) */}
      {isCallingModalOpen && targetCheckIn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-zinc-400" />
                Chamar Motorista para a Doca
              </h3>
              <button
                onClick={() => setIsCallingModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Motorista:</span>
                <span className="font-semibold text-white">{targetCheckIn.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Senha:</span>
                <span className="font-mono font-bold text-zinc-200">
                  #{String(targetCheckIn.ticketNumber).padStart(3, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Rota / Cidade:</span>
                <span className="text-zinc-200">
                  {targetCheckIn.route} ({targetCheckIn.city})
                </span>
              </div>
              {targetCheckIn.isPriority && (
                <div className="flex justify-between text-amber-300 font-semibold font-mono">
                  <span>Prioridade:</span>
                  <span>SIM</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Doca de Destino da Chamada:</span>
                {!hasAllDocksAccess && (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Sua Doca Exclusiva
                  </span>
                )}
              </label>

              {hasAllDocksAccess ? (
                <select
                  value={selectedDockForCall}
                  onChange={e => setSelectedDockForCall(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                >
                  {docks.map(dock => {
                    const isDockPaused = dock.status === 'paused' || dock.isPaused;
                    return (
                      <option key={dock.id} value={dock.name} disabled={isDockPaused}>
                        {dock.name} (
                        {isDockPaused
                          ? '⏸️ EM PAUSA'
                          : dock.status === 'free'
                          ? 'LIVRE'
                          : dock.status.toUpperCase()}
                        )
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-white text-sm">
                      {userAssignedDock || 'Doca não configurada'}
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Você só tem permissão para chamar para a sua própria doca.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Fixa
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCallingModalOpen(false)}
                className="w-1/2 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCall}
                className="w-1/2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Enviar Sinal Mobile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL FOR MOBILE TOTEM & DRIVER REGISTRATION */}
      <QRCodeTotemModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
