export type CheckInStatus =
  | 'waiting'      // Na fila de espera
  | 'called'       // Sendo chamado para a doca
  | 'at_dock'      // Encostado / Carregando
  | 'completed'    // Finalizado / Liberado
  | 'absent'       // Ausente / Não compareceu
  | 'cancelled';   // Cancelado

export type LocationStatus =
  | 'validated_base'  // Dentro do raio da base
  | 'outside_base'     // Fora da base (detectado pelo GPS)
  | 'gps_unavailable'  // GPS desativado/negado
  | 'manual_override'; // Autorizado manualmente

export interface DriverCheckIn {
  id: string;
  ticketNumber: number;
  driverName: string;
  licensePlate: string;
  phoneNumber?: string;
  route: string;
  city: string;
  arrivalDate: string;        // YYYY-MM-DD
  arrivalTime: string;        // HH:mm:ss
  timestamp: number;          // milliseconds
  isPriority: boolean;        // Prioritário SIM / NÃO (sem motivo de carga)
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  distanceToBaseMeters: number | null;
  isWithinBase: boolean;
  locationStatus: LocationStatus;
  status: CheckInStatus;
  assignedDock: string | null;      // ex: "Doca 03"
  calledAt: string | null;          // ISO string
  dockEnteredAt: string | null;
  completedAt: string | null;
  driverAcknowledgedAt?: string | null; // Confirmação no celular do motorista
  callCount: number;
  isManualRegistration: boolean;
  notes?: string;

  // Dados da Coleta preenchidos pelo Colaborador na Doca
  packageCount?: number | null;     // Quantidade de pacotes carregados
  iscaNumber?: string | null;       // Número da isca (quando necessário)
  collectorName?: string | null;    // Nome do colaborador que realizou a coleta
  collectorDock?: string | null;    // Doca onde o colaborador realizou a conferência
  collectedAt?: string | null;      // Data e hora da conferência
}

export interface RegisteredDriver {
  id: string;
  name: string;
  licensePlate: string;
  carrier: string;
  preferredRoute: string;
  preferredCity: string;
  phone: string;
  active: boolean;
}

export type UserRole =
  | 'master'        // Usuário Master (1 Conta Google vinculada)
  | 'admin'         // Administrativo (inicialmente 4, expansível)
  | 'colaborador';  // Colaboradores de Doca / Coleta (até 50+)

export interface UserPermissions {
  canViewSpreadsheet: boolean;  // Apenas Admins e Master (ou autorizado)
  canManageUsers: boolean;      // Criar e limitar usuários
  canCallDrivers: boolean;      // Chamar motoristas para a doca
  canCollectPackages: boolean;  // Registrar quantidade de pacotes e isca
  canConfigureDocks: boolean;   // Criar ou excluir docas
  canMovePackages?: boolean;    // Fazer todas as movimentações de pacotes entre rotas
  canUseChat?: boolean;         // Usar chat em tempo real com ADM
  canConsultCep?: boolean;      // Realizar consulta oficial de CEP
}

export interface CollaboratorUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isAdmin: boolean;
  isMaster?: boolean;
  pin: string;
  email: string;
  active: boolean;
  assignedDock?: string | null; // Doca em que está alocado atualmente
  permissions: UserPermissions;
  lastLogin?: string;
  createdAt: string;
}

export interface DockConfig {
  id: string;
  number: number;
  name: string;
  status: 'free' | 'calling' | 'occupied' | 'maintenance' | 'paused';
  currentCheckInId: string | null;
  currentDriverName: string | null;
  currentTicketNumber: number | null;
  currentRoute: string | null;
  callStartedAt: string | null;
  activeOperatorName?: string | null; // Colaborador atuando nesta doca
  isPaused?: boolean;
  pausedReason?: string | null;
  pausedAt?: string | null;
}

export interface MasterGoogleConfig {
  connected: boolean;
  email: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  formId?: string;
  formUrl?: string;
  autoSync: boolean;
  lastSyncAt: string | null;
}

export interface BaseSettings {
  baseName: string;
  baseLatitude: number;
  baseLongitude: number;
  allowedRadiusMeters: number;
  enforceBaseGeofence: boolean;
  autoVoiceCall: boolean;
  soundAlerts: boolean;
  totalDocks: number;
  masterGoogle: MasterGoogleConfig;
}

export interface CallAnnouncement {
  id: string;
  ticketNumber: number;
  driverName: string;
  dockName: string;
  route: string;
  city: string;
  isPriority: boolean;
  timestamp: number;
  calledAtFormatted: string;
  operatorName?: string;
}

export interface DailySheetSummary {
  date: string;
  totalCheckIns: number;
  completedCount: number;
  priorityCount: number;
  outsideBaseCount: number;
  totalPackages: number;
  isCurrentDay: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'master' | 'admin' | 'colaborador';
  senderDock?: string | null;  // Ex: "Doca 02"
  targetDock?: string | null;  // Ex: "Doca 02" ou null (geral para todas as docas)
  content: string;
  timestamp: number;
  createdAtFormatted: string;  // HH:mm:ss
  isUrgent?: boolean;
}

export interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade / Município
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  suggestedRoute?: string;     // Ex: "16A - Ceilândia Centro, Sul & P Sul"
  suggestedRouteCode?: string; // Ex: "16A"
  suggestedZone?: string;      // "DF" ou "Entorno"
}

export interface PackageMovement {
  id: string;
  sourceRoute?: string;        // Rota ou doca de origem
  targetRoute: string;         // Rota de destino
  packageCount: number;        // Quantidade de pacotes adicionados/movimentados
  trackingCode?: string;       // Etiqueta do pacote / NF
  notes: string;               // Observação nesta rota
  collaboratorName: string;    // Operador responsável
  collaboratorDock?: string;   // Doca do colaborador
  timestamp: number;
  createdAtFormatted: string;  // HH:mm:ss
}
