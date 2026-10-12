import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.resolve(__dirname, 'data_store.json');

// Interface definition for DB
interface DbStore {
  settings: {
    baseName: string;
    baseLatitude: number;
    baseLongitude: number;
    allowedRadiusMeters: number;
    enforceBaseGeofence: boolean;
    autoVoiceCall: boolean;
    soundAlerts: boolean;
    totalDocks: number;
    masterGoogle: {
      connected: boolean;
      email: string;
      spreadsheetId: string;
      spreadsheetUrl: string;
      formId?: string;
      formUrl?: string;
      autoSync: boolean;
      lastSyncAt: string | null;
    };
  };
  collaborators: Array<{
    id: string;
    name: string;
    username: string;
    role: 'master' | 'admin' | 'colaborador';
    isAdmin: boolean;
    isMaster?: boolean;
    pin: string;
    email: string;
    active: boolean;
    assignedDock?: string | null;
    permissions: {
      canViewSpreadsheet: boolean;
      canManageUsers: boolean;
      canCallDrivers: boolean;
      canCollectPackages: boolean;
      canConfigureDocks: boolean;
    };
    lastLogin?: string;
    createdAt: string;
  }>;
  registeredDrivers: Array<{
    id: string;
    name: string;
    licensePlate: string;
    carrier: string;
    preferredRoute: string;
    preferredCity: string;
    phone: string;
    active: boolean;
  }>;
  docks: Array<{
    id: string;
    number: number;
    name: string;
    status: 'free' | 'calling' | 'occupied' | 'maintenance' | 'paused';
    currentCheckInId: string | null;
    currentDriverName: string | null;
    currentTicketNumber: number | null;
    currentRoute: string | null;
    callStartedAt: string | null;
    activeOperatorName?: string | null;
    isPaused?: boolean;
    pausedReason?: string | null;
    pausedAt?: string | null;
  }>;
  dailySheets: Record<string, Array<any>>;
  activeCallAnnouncement: any | null;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: 'master' | 'admin' | 'colaborador';
    senderDock?: string | null;
    targetDock?: string | null;
    content: string;
    timestamp: number;
    createdAtFormatted: string;
    isUrgent?: boolean;
  }>;
  packageMovements?: Array<{
    id: string;
    sourceRoute?: string;
    targetRoute: string;
    packageCount: number;
    trackingCode?: string | null;
    notes: string;
    collaboratorName: string;
    collaboratorDock?: string | null;
    timestamp: number;
    createdAtFormatted: string;
  }>;
}

// Initial Data Seed
function getInitialData(): DbStore {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // 10 Initial Docks
  const docks = Array.from({ length: 10 }, (_, i) => ({
    id: `dock-${i + 1}`,
    number: i + 1,
    name: `Doca ${String(i + 1).padStart(2, '0')}`,
    status: 'free' as DbStore['docks'][number]['status'],
    currentCheckInId: null as string | null,
    currentDriverName: null as string | null,
    currentTicketNumber: null as number | null,
    currentRoute: null as string | null,
    callStartedAt: null as string | null,
    activeOperatorName: null as string | null,
    isPaused: false,
    pausedReason: null as string | null,
    pausedAt: null as string | null,
  }));

  // Initial Collaborators: 1 Master Google Account, 4 Admins, and Collaborator team (expandable to 50+)
  const collaborators = [
    {
      id: 'collab-master',
      name: 'Gestor Geral Master (Conta Google)',
      username: 'master.logistics',
      role: 'master' as const,
      isAdmin: true,
      isMaster: true,
      pin: '1234',
      email: 'gilianocosta804@gmail.com',
      active: true,
      assignedDock: null,
      permissions: {
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
      },
      createdAt: '2026-01-01',
    },
    {
      id: 'collab-admin-1',
      name: 'Carlos Eduardo Santos',
      username: 'carlos.admin',
      role: 'admin' as const,
      isAdmin: true,
      pin: '1234',
      email: 'carlos.admin@empresa.com',
      active: true,
      assignedDock: null,
      permissions: {
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
      },
      createdAt: '2026-01-01',
    },
    {
      id: 'collab-admin-2',
      name: 'Mariana Souza Lima',
      username: 'mariana.admin',
      role: 'admin' as const,
      isAdmin: true,
      pin: '1234',
      email: 'mariana.admin@empresa.com',
      active: true,
      assignedDock: null,
      permissions: {
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
      },
      createdAt: '2026-01-01',
    },
    {
      id: 'collab-admin-3',
      name: 'Roberto Silveira Silva',
      username: 'roberto.admin',
      role: 'admin' as const,
      isAdmin: true,
      pin: '1234',
      email: 'roberto.admin@empresa.com',
      active: true,
      assignedDock: null,
      permissions: {
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
      },
      createdAt: '2026-01-01',
    },
    {
      id: 'collab-admin-4',
      name: 'Juliana Martins Costa',
      username: 'juliana.admin',
      role: 'admin' as const,
      isAdmin: true,
      pin: '1234',
      email: 'juliana.admin@empresa.com',
      active: true,
      assignedDock: null,
      permissions: {
        canViewSpreadsheet: true,
        canManageUsers: true,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: true,
      },
      createdAt: '2026-01-01',
    },
    // Sample dock collaborators (of the 50 operational team)
    {
      id: 'collab-op-1',
      name: 'Lucas Ferreira (Conferente)',
      username: 'lucas.doca',
      role: 'colaborador' as const,
      isAdmin: false,
      pin: '1234',
      email: 'lucas.doca@empresa.com',
      active: true,
      assignedDock: 'Doca 01',
      permissions: {
        canViewSpreadsheet: false, // apenas administrativos e master têm acesso
        canManageUsers: false,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: false,
      },
      createdAt: '2026-02-01',
    },
    {
      id: 'collab-op-2',
      name: 'Fernando Guarita (Portaria)',
      username: 'fernando.portaria',
      role: 'colaborador' as const,
      isAdmin: false,
      pin: '1234',
      email: 'portaria@empresa.com',
      active: true,
      assignedDock: 'Doca 02',
      permissions: {
        canViewSpreadsheet: false,
        canManageUsers: false,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: false,
      },
      createdAt: '2026-02-05',
    },
    {
      id: 'collab-op-3',
      name: 'Patrícia Rocha (Expedição)',
      username: 'patricia.conferente',
      role: 'colaborador' as const,
      isAdmin: false,
      pin: '1234',
      email: 'patricia@empresa.com',
      active: true,
      assignedDock: 'Doca 03',
      permissions: {
        canViewSpreadsheet: false,
        canManageUsers: false,
        canCallDrivers: true,
        canCollectPackages: true,
        canConfigureDocks: false,
      },
      createdAt: '2026-02-10',
    },
  ];

  // Pre-registered drivers for autocomplete with DF & Entorno routes (alphanumeric scale)
  const registeredDrivers = [
    {
      id: 'drv-1',
      name: 'Marcos Vinícius Silva',
      licensePlate: 'BRA2E19',
      carrier: 'TransLog Express',
      preferredRoute: '01A',
      preferredCity: 'Gama - DF',
      phone: '(61) 98765-4321',
      active: true,
    },
    {
      id: 'drv-2',
      name: 'Anderson Pereira Gomes',
      licensePlate: 'RIO4F22',
      carrier: 'ABC Cargas Rápidas',
      preferredRoute: '16A',
      preferredCity: 'Ceilândia - DF',
      phone: '(61) 99123-5566',
      active: true,
    },
    {
      id: 'drv-3',
      name: 'Rodrigo Almeida Rocha',
      licensePlate: 'GYN9A88',
      carrier: 'Rodoviário Cometa',
      preferredRoute: '04A',
      preferredCity: 'Brasília - DF',
      phone: '(61) 97112-9988',
      active: true,
    },
    {
      id: 'drv-4',
      name: 'Cleber Souza Santos',
      licensePlate: 'PRT1K33',
      carrier: 'LogSul Distribuição',
      preferredRoute: '14A',
      preferredCity: 'Valparaíso de Goiás - GO',
      phone: '(61) 98877-2211',
      active: true,
    },
    {
      id: 'drv-5',
      name: 'Valdir dos Santos Ramos',
      licensePlate: 'SPX7B54',
      carrier: 'TransBrasil Log',
      preferredRoute: '02A',
      preferredCity: 'Taguatinga - DF',
      phone: '(61) 99443-1289',
      active: true,
    },
    {
      id: 'drv-6',
      name: 'Tiago Oliveira de Paula',
      licensePlate: 'MGT3C91',
      carrier: 'TransNacional Express',
      preferredRoute: '03A',
      preferredCity: 'Samambaia - DF',
      phone: '(61) 96321-4477',
      active: true,
    },
    {
      id: 'drv-7',
      name: 'José Carlos Albuquerque',
      licensePlate: 'KLP8D20',
      carrier: 'Rápido Centro-Oeste',
      preferredRoute: '15A',
      preferredCity: 'Novo Gama - GO',
      phone: '(61) 97788-3344',
      active: true,
    },
    {
      id: 'drv-8',
      name: 'Eduardo Martins Ferreira',
      licensePlate: 'FTY5A11',
      carrier: 'TransLog Express',
      preferredRoute: '18A',
      preferredCity: 'Águas Lindas de Goiás - GO',
      phone: '(61) 98123-6655',
      active: true,
    },
    {
      id: 'drv-9',
      name: 'giliano',
      licensePlate: 'BSS2545',
      carrier: 'E2E Docas Logística',
      preferredRoute: '16B',
      preferredCity: 'Ceilândia - DF',
      phone: '(61) 99999-9999',
      active: true,
    },
    {
      id: 'drv-10',
      name: 'bruno nogueira',
      licensePlate: 'BSB2568',
      carrier: 'Expresso Planalto',
      preferredRoute: '05A',
      preferredCity: 'Santa Maria - DF',
      phone: '(61) 98452-1144',
      active: true,
    },
  ];

  // Coordenadas: Condomínio SYS Gama - Ponte Alta (Gama, DF)
  const baseLatitude = -15.9897;
  const baseLongitude = -48.0536;

  const sampleTime = (offsetMinutes: number) => {
    const d = new Date(now.getTime() - offsetMinutes * 60000);
    return d.toTimeString().slice(0, 8);
  };

  const sampleCheckIns = [
    {
      id: 'chk-1',
      ticketNumber: 1,
      driverName: 'Marcos Vinícius Silva',
      licensePlate: 'BRA2E19',
      phoneNumber: '(61) 98765-4321',
      route: '01A',
      city: 'Gama - DF',
      arrivalDate: today,
      arrivalTime: sampleTime(45),
      timestamp: now.getTime() - 45 * 60000,
      isPriority: true,
      latitude: baseLatitude + 0.00015,
      longitude: baseLongitude + 0.0001,
      locationAccuracy: 10,
      distanceToBaseMeters: 22,
      isWithinBase: true,
      locationStatus: 'validated_base',
      status: 'at_dock',
      assignedDock: 'Doca 01',
      calledAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      dockEnteredAt: new Date(now.getTime() - 20 * 60000).toISOString(),
      completedAt: null,
      callCount: 1,
      isManualRegistration: false,
      packageCount: 42,
      iscaNumber: 'ISCA-9921',
      collectorName: 'Lucas Ferreira',
      collectorDock: 'Doca 01',
      collectedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
      notes: '',
    },
    {
      id: 'chk-2',
      ticketNumber: 2,
      driverName: 'Anderson Pereira Gomes',
      licensePlate: 'RIO4F22',
      phoneNumber: '(61) 99123-5566',
      route: '16A',
      city: 'Ceilândia - DF',
      arrivalDate: today,
      arrivalTime: sampleTime(35),
      timestamp: now.getTime() - 35 * 60000,
      isPriority: false,
      latitude: baseLatitude + 0.00025,
      longitude: baseLongitude - 0.00015,
      locationAccuracy: 12,
      distanceToBaseMeters: 35,
      isWithinBase: true,
      locationStatus: 'validated_base',
      status: 'called',
      assignedDock: 'Doca 03',
      calledAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      dockEnteredAt: null,
      completedAt: null,
      callCount: 2,
      isManualRegistration: false,
      packageCount: null,
      iscaNumber: null,
      collectorName: null,
      collectorDock: null,
      collectedAt: null,
      notes: '',
    },
    {
      id: 'chk-3',
      ticketNumber: 3,
      driverName: 'Rodrigo Almeida Rocha',
      licensePlate: 'GYN9A88',
      phoneNumber: '(61) 97112-9988',
      route: '04A',
      city: 'Brasília - DF',
      arrivalDate: today,
      arrivalTime: sampleTime(25),
      timestamp: now.getTime() - 25 * 60000,
      isPriority: true,
      latitude: baseLatitude + 0.0001,
      longitude: baseLongitude + 0.00012,
      locationAccuracy: 8,
      distanceToBaseMeters: 18,
      isWithinBase: true,
      locationStatus: 'validated_base',
      status: 'waiting',
      assignedDock: null,
      calledAt: null,
      dockEnteredAt: null,
      completedAt: null,
      callCount: 0,
      isManualRegistration: false,
      packageCount: null,
      iscaNumber: null,
      notes: '',
    },
  ];

  docks[0].status = 'occupied';
  docks[0].currentCheckInId = 'chk-1';
  docks[0].currentDriverName = 'Marcos Vinícius Silva';
  docks[0].currentTicketNumber = 1;
  docks[0].currentRoute = '01A';
  docks[0].activeOperatorName = 'Lucas Ferreira';

  docks[2].status = 'calling';
  docks[2].currentCheckInId = 'chk-2';
  docks[2].currentDriverName = 'Anderson Pereira Gomes';
  docks[2].currentTicketNumber = 2;
  docks[2].currentRoute = '16A';
  docks[2].callStartedAt = new Date(now.getTime() - 5 * 60000).toISOString();
  docks[2].activeOperatorName = 'Patrícia Rocha';

  const dailySheets: Record<string, any[]> = {};
  dailySheets[today] = sampleCheckIns;

  return {
    settings: {
      baseName: 'Condomínio SYS Gama - Ponte Alta (Gama - DF)',
      baseLatitude,
      baseLongitude,
      allowedRadiusMeters: 500,
      enforceBaseGeofence: true,
      autoVoiceCall: true,
      soundAlerts: true,
      totalDocks: 10,
      masterGoogle: {
        connected: true,
        email: 'gilianocosta804@gmail.com',
        spreadsheetId: `e2e_docas_sheets_${today.replace(/-/g, '_')}`,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`,
        formId: `e2e_docas_form_${today}`,
        formUrl: `https://docs.google.com/forms/d/1E2E_Docas_Form_${today}`,
        autoSync: true,
        lastSyncAt: now.toISOString(),
      },
    },
    collaborators,
    registeredDrivers,
    docks,
    dailySheets,
    activeCallAnnouncement: {
      id: 'chk-2',
      ticketNumber: 2,
      driverName: 'Anderson Pereira Gomes',
      dockName: 'Doca 03',
      route: '16A',
      city: 'Ceilândia - DF',
      isPriority: false,
      timestamp: Date.now() - 300000,
      calledAtFormatted: sampleTime(5),
    },
    messages: [
      {
        id: 'msg-seed-1',
        senderId: 'collab-1',
        senderName: 'Carlos Eduardo Santos',
        senderRole: 'admin',
        senderDock: null,
        targetDock: null,
        content: 'Equipe, bom dia! Operação iniciada no SYS Gama com foco nas rotas 16A e 01A.',
        timestamp: Date.now() - 3600000,
        createdAtFormatted: sampleTime(60),
        isUrgent: false,
      },
      {
        id: 'msg-seed-2',
        senderId: 'collab-5',
        senderName: 'Lucas Ferreira',
        senderRole: 'colaborador',
        senderDock: 'Doca 01',
        targetDock: null,
        content: 'Doca 01 operando normal. Rota 01A conferindo 42 pacotes com isca.',
        timestamp: Date.now() - 1800000,
        createdAtFormatted: sampleTime(30),
        isUrgent: false,
      },
      {
        id: 'msg-seed-3',
        senderId: 'collab-7',
        senderName: 'Patrícia Rocha',
        senderRole: 'colaborador',
        senderDock: 'Doca 03',
        targetDock: null,
        content: 'Doca 03 aguardando encoste do motorista Anderson (16A Ceilândia).',
        timestamp: Date.now() - 600000,
        createdAtFormatted: sampleTime(10),
        isUrgent: false,
      },
    ],
  };
}

// Load DB from file or init
let db: DbStore;
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    db = JSON.parse(raw);
  } else {
    db = getInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  }
} catch (err) {
  console.error('Failed reading data file, using fresh initial seed:', err);
  db = getInitialData();
}

// Ensure messages array exists
if (!db.messages) {
  db.messages = [];
  saveDb();
}

// Ensure masterGoogle settings exist
if (!db.settings.masterGoogle) {
  const today = new Date().toISOString().slice(0, 10);
  db.settings.masterGoogle = {
    connected: true,
    email: 'gilianocosta804@gmail.com',
    spreadsheetId: `e2e_docas_sheets_${today.replace(/-/g, '_')}`,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`,
    formId: `e2e_docas_form_${today}`,
    formUrl: `https://docs.google.com/forms/d/1E2E_Docas_Form_${today}`,
    autoSync: true,
    lastSyncAt: new Date().toISOString(),
  };
  saveDb();
}

function saveDb(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

// Haversine formula
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// SSE Clients for real-time events
interface SSEClient {
  id: number;
  res: Response;
}
const sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  }
}

// Ensure today's sheet exists and renews every day
function getTodaySheet(): any[] {
  const today = new Date().toISOString().slice(0, 10);
  if (!db.dailySheets[today]) {
    db.dailySheets[today] = [];
    // Auto-create Master Google Sheets info for today
    db.settings.masterGoogle.spreadsheetId = `e2e_docas_sheets_${today.replace(/-/g, '_')}`;
    db.settings.masterGoogle.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`;
    db.settings.masterGoogle.lastSyncAt = new Date().toISOString();
    saveDb();
    broadcastEvent('sheet_renewed', { date: today });
  }
  return db.dailySheets[today];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // SSE Stream Endpoint
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = nextClientId++;
    sseClients.push({ id: clientId, res });

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === clientId);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(db.settings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    db.settings = { ...db.settings, ...req.body };
    saveDb();
    broadcastEvent('settings_updated', db.settings);
    res.json({ success: true, settings: db.settings });
  });

  // Master Google account connect / sync
  app.post('/api/google/sync', (req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const email = req.body.email || db.settings.masterGoogle.email;
    db.settings.masterGoogle = {
      connected: true,
      email,
      spreadsheetId: `e2e_docas_sheets_${today.replace(/-/g, '_')}`,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`,
      formId: `e2e_docas_form_${today}`,
      formUrl: `https://docs.google.com/forms/d/1E2E_Docas_Form_${today}`,
      autoSync: true,
      lastSyncAt: new Date().toISOString(),
    };
    saveDb();
    broadcastEvent('settings_updated', db.settings);
    res.json({ success: true, masterGoogle: db.settings.masterGoogle });
  });

  // Collaborators Sheet & Auth
  app.get('/api/collaborators', (_req: Request, res: Response) => {
    res.json(db.collaborators);
  });

  // Login: verifies credentials, requires assignedDock for collaborators
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, pin, assignedDock } = req.body;
    const user = db.collaborators.find(
      u => u.username.toLowerCase() === (username || '').toLowerCase() && u.pin === pin && u.active
    );
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
    }

    user.lastLogin = new Date().toISOString();
    if (assignedDock) {
      user.assignedDock = assignedDock;
      // Also register operator on dock config
      const dock = db.docks.find(d => d.name.toLowerCase() === assignedDock.toLowerCase());
      if (dock) {
        dock.activeOperatorName = user.name;
      }
    }

    // Auto-create today's Google Spreadsheets and Forms on Master principal login
    if (user.isMaster || user.role === 'master') {
      const today = new Date().toISOString().slice(0, 10);
      db.settings.masterGoogle = {
        connected: true,
        email: user.email || 'gilianocosta804@gmail.com',
        spreadsheetId: `e2e_docas_sheets_${today.replace(/-/g, '_')}`,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`,
        formId: `e2e_docas_form_${today}`,
        formUrl: `https://docs.google.com/forms/d/1E2E_Docas_Form_${today}`,
        autoSync: true,
        lastSyncAt: new Date().toISOString(),
      };
      broadcastEvent('settings_updated', db.settings);
    }

    saveDb();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isAdmin: user.isAdmin,
        isMaster: Boolean(user.isMaster),
        email: user.email,
        assignedDock: user.assignedDock,
        permissions: user.permissions,
      },
    });
  });

  // Create new user with custom permissions & role
  app.post('/api/collaborators', (req: Request, res: Response) => {
    const { name, username, role, pin, email, permissions, assignedDock } = req.body;
    if (!name || !username || !pin) {
      return res.status(400).json({ error: 'Nome, usuário e PIN são obrigatórios.' });
    }

    if (db.collaborators.some(c => c.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: 'Nome de usuário já existe.' });
    }

    const isAdmin = role === 'admin' || role === 'master';
    const isMaster = role === 'master';

    const defaultPermissions = {
      canViewSpreadsheet: isAdmin,
      canManageUsers: isAdmin,
      canCallDrivers: true,
      canCollectPackages: true,
      canConfigureDocks: isAdmin,
    };

    const newCollab = {
      id: `collab-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role: role || 'colaborador',
      isAdmin,
      isMaster,
      pin: pin.trim(),
      email: email ? email.trim() : '',
      active: true,
      assignedDock: assignedDock || null,
      permissions: permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    db.collaborators.push(newCollab);
    saveDb();
    broadcastEvent('collaborators_updated', db.collaborators);
    res.json({ success: true, collaborator: newCollab });
  });

  app.put('/api/collaborators/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.collaborators.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    const existing = db.collaborators[index];
    const newRole = req.body.role ?? existing.role;
    const isAdmin = newRole === 'admin' || newRole === 'master';

    db.collaborators[index] = {
      ...existing,
      ...req.body,
      isAdmin,
      permissions: req.body.permissions ? { ...existing.permissions, ...req.body.permissions } : existing.permissions,
    };

    saveDb();
    broadcastEvent('collaborators_updated', db.collaborators);
    res.json({ success: true, collaborator: db.collaborators[index] });
  });

  app.delete('/api/collaborators/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const user = db.collaborators.find(c => c.id === id);
    if (!user) return res.status(404).json({ error: 'Não encontrado.' });

    if (user.isMaster) {
      return res.status(400).json({ error: 'Não é possível excluir o Usuário Master do sistema.' });
    }

    db.collaborators = db.collaborators.filter(c => c.id !== id);
    saveDb();
    broadcastEvent('collaborators_updated', db.collaborators);
    res.json({ success: true });
  });

  // Registered Drivers list for Autocomplete
  app.get('/api/registered-drivers', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    if (!q) {
      return res.json(db.registeredDrivers);
    }
    const filtered = db.registeredDrivers.filter(
      d => d.name.toLowerCase().includes(q) || d.licensePlate.toLowerCase().includes(q)
    );
    res.json(filtered);
  });

  // Google Sheets Master Sync & Automatic Creation on Master Login
  app.post('/api/google/sync', (req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const email = req.body?.email || db.settings.masterGoogle?.email || 'gilianocosta804@gmail.com';

    db.settings.masterGoogle = {
      connected: true,
      email,
      spreadsheetId: `e2e_docas_sheets_${today.replace(/-/g, '_')}`,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1E2E_Docas_${today}`,
      formId: `e2e_docas_form_${today}`,
      formUrl: `https://docs.google.com/forms/d/1E2E_Docas_Form_${today}`,
      autoSync: true,
      lastSyncAt: new Date().toISOString(),
    };

    saveDb();
    broadcastEvent('settings_updated', db.settings);
    res.json({ success: true, masterGoogle: db.settings.masterGoogle });
  });

  // Daily Sheets / Check-ins
  app.get('/api/daily-sheets', (_req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    getTodaySheet();

    const dates = Object.keys(db.dailySheets).sort((a, b) => b.localeCompare(a));
    const summaries = dates.map(date => {
      const items = db.dailySheets[date] || [];
      const totalPackages = items.reduce((acc, curr) => acc + (Number(curr.packageCount) || 0), 0);
      return {
        date,
        totalCheckIns: items.length,
        completedCount: items.filter(i => i.status === 'completed').length,
        priorityCount: items.filter(i => i.isPriority).length,
        outsideBaseCount: items.filter(i => i.locationStatus === 'outside_base').length,
        totalPackages,
        isCurrentDay: date === today,
      };
    });
    res.json(summaries);
  });

  app.get('/api/checkins', (req: Request, res: Response) => {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    if (!db.dailySheets[date]) {
      if (date === new Date().toISOString().slice(0, 10)) {
        db.dailySheets[date] = [];
        saveDb();
      } else {
        return res.json([]);
      }
    }
    res.json(db.dailySheets[date]);
  });

  // Driver Check-in Submission (Simplified Priority, No reason, No cargo type)
  app.post('/api/checkins', (req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayList = getTodaySheet();

    const {
      driverName,
      licensePlate,
      phoneNumber,
      route,
      city,
      isPriority,
      latitude,
      longitude,
      locationAccuracy,
      isManualRegistration,
      notes,
    } = req.body;

    if (!driverName || !route || !city) {
      return res.status(400).json({ error: 'Nome do motorista, rota e cidade são obrigatórios.' });
    }

    const now = new Date();
    const arrivalTime = now.toTimeString().slice(0, 8);

    let distanceToBaseMeters: number | null = null;
    let isWithinBase = false;
    let locationStatus: 'validated_base' | 'outside_base' | 'gps_unavailable' = 'gps_unavailable';

    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      distanceToBaseMeters = calculateHaversineDistance(
        latitude,
        longitude,
        db.settings.baseLatitude,
        db.settings.baseLongitude
      );
      // Fator de tolerância para oscilação do GPS em galpões industriais com cobertura metálica
      const accuracyMargin = Math.min(150, Math.max(0, Number(locationAccuracy) || 0));
      const effectiveDistance = Math.max(0, distanceToBaseMeters - accuracyMargin * 0.7);
      isWithinBase = effectiveDistance <= db.settings.allowedRadiusMeters;
      locationStatus = isWithinBase ? 'validated_base' : 'outside_base';
    }

    const presentialConfirmed = Boolean(req.body.presentialConfirmed);
    if (presentialConfirmed) {
      isWithinBase = true;
      locationStatus = 'validated_base';
    }

    // Validação de Geocerca no Condomínio SYS Gama
    if (db.settings.enforceBaseGeofence && !isManualRegistration && !presentialConfirmed) {
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        return res.status(400).json({
          error: `Localização GPS necessária. Se o sinal estiver instável no galpão, confirme a presença presencial no botão do formulário.`,
        });
      }
      if (!isWithinBase) {
        return res.status(400).json({
          error: `Você está a ${Math.round(distanceToBaseMeters || 0)} metros da base. O raio de cobertura é de ${db.settings.allowedRadiusMeters} metros. Você pode calibrar a posição da base ou confirmar presença no pátio.`,
        });
      }
    }

    const ticketNumber = todayList.length + 1;

    const newCheckIn = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketNumber,
      driverName: driverName.trim(),
      licensePlate: (licensePlate || '').toUpperCase().trim(),
      phoneNumber: phoneNumber || '',
      route: route.trim(),
      city: city.trim(),
      arrivalDate: today,
      arrivalTime,
      timestamp: now.getTime(),
      isPriority: Boolean(isPriority), // Just boolean priority, no reason required!
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationAccuracy: locationAccuracy ?? null,
      distanceToBaseMeters,
      isWithinBase,
      locationStatus,
      status: 'waiting' as const,
      assignedDock: null,
      calledAt: null,
      dockEnteredAt: null,
      completedAt: null,
      callCount: 0,
      isManualRegistration: Boolean(isManualRegistration),
      packageCount: null,
      iscaNumber: null,
      collectorName: null,
      collectorDock: null,
      collectedAt: null,
      notes: notes || '',
    };

    todayList.push(newCheckIn);
    saveDb();

    broadcastEvent('new_checkin', newCheckIn);

    res.json({
      success: true,
      checkIn: newCheckIn,
      message: `Check-in realizado com sucesso! Senha nº ${String(ticketNumber).padStart(3, '0')}`,
    });
  });

  // Call Driver to a Dock
  app.post('/api/checkins/:id/call', (req: Request, res: Response) => {
    const { id } = req.params;
    const { dockName, operatorName, userId } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const todayList = getTodaySheet();

    const checkIn = todayList.find(c => c.id === id);
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in não encontrado.' });
    }

    if (!dockName) {
      return res.status(400).json({ error: 'Nome da doca é obrigatório.' });
    }

    // Role check: collaborators can only call to their own assigned dock
    if (userId) {
      const caller = db.collaborators.find(c => c.id === userId);
      if (caller && !caller.isAdmin && !caller.isMaster) {
        if (!caller.assignedDock) {
          return res.status(403).json({
            error: 'Acesso restrito: você precisa selecionar em qual doca está operando para realizar chamadas.'
          });
        }
        if (caller.assignedDock.toLowerCase() !== dockName.toLowerCase()) {
          return res.status(403).json({
            error: `Acesso negado: como colaborador, você só pode chamar motoristas para a sua própria doca (${caller.assignedDock}). Apenas os 4 administradores e o usuário master têm acesso a todas as docas.`
          });
        }
      }
    }

    const dock = db.docks.find(d => d.name.toLowerCase() === dockName.toLowerCase());
    if (dock && (dock.status === 'paused' || dock.isPaused)) {
      return res.status(400).json({
        error: `A ${dock.name} está temporariamente em PAUSA (${dock.pausedReason || 'Doca pausada'}). Clique em 'Retomar Doca' antes de chamar um motorista.`
      });
    }
    if (dock && dock.status === 'maintenance') {
      return res.status(400).json({
        error: `A ${dock.name} está em manutenção no momento.`
      });
    }

    const now = new Date();
    checkIn.status = 'called';
    checkIn.assignedDock = dockName;
    checkIn.calledAt = now.toISOString();
    checkIn.callCount = (checkIn.callCount || 0) + 1;

    if (dock) {
      dock.status = 'calling';
      dock.isPaused = false;
      dock.pausedReason = null;
      dock.pausedAt = null;
      dock.currentCheckInId = checkIn.id;
      dock.currentDriverName = checkIn.driverName;
      dock.currentTicketNumber = checkIn.ticketNumber;
      dock.currentRoute = checkIn.route;
      dock.callStartedAt = now.toISOString();
      if (operatorName) dock.activeOperatorName = operatorName;
    }

    const announcement = {
      id: checkIn.id,
      ticketNumber: checkIn.ticketNumber,
      driverName: checkIn.driverName,
      dockName,
      route: checkIn.route,
      city: checkIn.city,
      isPriority: checkIn.isPriority,
      timestamp: Date.now(),
      calledAtFormatted: now.toTimeString().slice(0, 8),
      operatorName: operatorName || 'Expedição',
    };
    db.activeCallAnnouncement = announcement;

    saveDb();

    broadcastEvent('driver_called', announcement);
    broadcastEvent('docks_updated', db.docks);
    broadcastEvent('checkin_updated', checkIn);

    res.json({ success: true, checkIn, announcement });
  });

  // Driver Acknowledged Call on Mobile
  app.post('/api/checkins/:id/acknowledge', (req: Request, res: Response) => {
    const { id } = req.params;
    const today = new Date().toISOString().slice(0, 10);
    const todayList = getTodaySheet();

    const checkIn = todayList.find(c => c.id === id);
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in não encontrado.' });
    }

    const now = new Date();
    checkIn.driverAcknowledgedAt = now.toISOString();
    saveDb();

    broadcastEvent('driver_acknowledged', {
      id: checkIn.id,
      driverName: checkIn.driverName,
      assignedDock: checkIn.assignedDock,
      acknowledgedAt: now.toISOString(),
      timeFormatted: now.toTimeString().slice(0, 8),
    });
    broadcastEvent('checkin_updated', checkIn);

    res.json({ success: true, checkIn });
  });

  // Record Collection: Package count & Isca number by Collaborator
  app.put('/api/checkins/:id/collection', (req: Request, res: Response) => {
    const { id } = req.params;
    const { packageCount, iscaNumber, collectorName, collectorDock } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const todayList = getTodaySheet();

    const checkIn = todayList.find(c => c.id === id);
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in não encontrado.' });
    }

    const now = new Date();
    checkIn.packageCount = packageCount !== undefined && packageCount !== '' ? Number(packageCount) : null;
    checkIn.iscaNumber = iscaNumber ? String(iscaNumber).trim() : null;
    checkIn.collectorName = collectorName || checkIn.collectorName || 'Colaborador';
    checkIn.collectorDock = collectorDock || checkIn.assignedDock || null;
    checkIn.collectedAt = now.toISOString();

    saveDb();

    broadcastEvent('checkin_updated', checkIn);
    res.json({ success: true, checkIn });
  });

  // Update Check-in Status
  app.put('/api/checkins/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, packageCount, iscaNumber, collectorName, collectorDock } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const todayList = getTodaySheet();

    const checkIn = todayList.find(c => c.id === id);
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in não encontrado.' });
    }

    const now = new Date();
    checkIn.status = status;
    if (notes !== undefined) checkIn.notes = notes;

    if (packageCount !== undefined) checkIn.packageCount = Number(packageCount);
    if (iscaNumber !== undefined) checkIn.iscaNumber = iscaNumber;
    if (collectorName !== undefined) checkIn.collectorName = collectorName;
    if (collectorDock !== undefined) checkIn.collectorDock = collectorDock;

    if (status === 'at_dock') {
      checkIn.dockEnteredAt = now.toISOString();
      const dock = db.docks.find(d => d.name === checkIn.assignedDock);
      if (dock) {
        dock.status = 'occupied';
      }
    } else if (status === 'completed' || status === 'cancelled' || status === 'absent') {
      if (status === 'completed') {
        checkIn.completedAt = now.toISOString();
      }
      const dock = db.docks.find(d => d.currentCheckInId === checkIn.id);
      if (dock) {
        dock.status = 'free';
        dock.currentCheckInId = null;
        dock.currentDriverName = null;
        dock.currentTicketNumber = null;
        dock.currentRoute = null;
        dock.callStartedAt = null;
      }
      if (db.activeCallAnnouncement?.id === checkIn.id) {
        db.activeCallAnnouncement = null;
      }
    }

    saveDb();
    broadcastEvent('checkin_updated', checkIn);
    broadcastEvent('docks_updated', db.docks);
    res.json({ success: true, checkIn });
  });

  // Docks status
  app.get('/api/docks', (_req: Request, res: Response) => {
    res.json(db.docks);
  });

  // Add a new dock
  app.post('/api/docks', (req: Request, res: Response) => {
    const existingNumbers = db.docks.map(d => d.number);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    const customName = req.body?.name ? String(req.body.name).trim() : null;
    const dockName = customName || `Doca ${String(nextNumber).padStart(2, '0')}`;

    const newDock = {
      id: `dock-${Date.now()}-${nextNumber}`,
      number: nextNumber,
      name: dockName,
      status: 'free' as const,
      currentCheckInId: null,
      currentDriverName: null,
      currentTicketNumber: null,
      currentRoute: null,
      callStartedAt: null,
      activeOperatorName: null,
      isPaused: false,
      pausedReason: null,
      pausedAt: null,
    };

    db.docks.push(newDock);
    db.settings.totalDocks = db.docks.length;
    saveDb();

    broadcastEvent('docks_updated', db.docks);
    res.json({ success: true, dock: newDock, totalDocks: db.docks.length });
  });

  // Remove an empty dock
  app.delete('/api/docks/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const dock = db.docks.find(d => d.id === id);
    if (!dock) return res.status(404).json({ error: 'Doca não encontrada.' });

    if (dock.status === 'occupied' || dock.status === 'calling') {
      return res.status(400).json({ error: 'Não é possível excluir uma doca em uso no momento.' });
    }

    db.docks = db.docks.filter(d => d.id !== id);
    db.settings.totalDocks = db.docks.length;
    saveDb();

    broadcastEvent('docks_updated', db.docks);
    res.json({ success: true, totalDocks: db.docks.length });
  });

  app.put('/api/docks/:id/maintenance', (req: Request, res: Response) => {
    const { id } = req.params;
    const dock = db.docks.find(d => d.id === id);
    if (!dock) return res.status(404).json({ error: 'Doca não encontrada.' });
    dock.status = dock.status === 'maintenance' ? 'free' : 'maintenance';
    saveDb();
    broadcastEvent('docks_updated', db.docks);
    res.json({ success: true, dock });
  });

  // Pause / Resume dock (Pausa temporária)
  app.put('/api/docks/:id/pause', (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, reason } = req.body || {};
    const dock = db.docks.find(d => d.id === id);
    if (!dock) return res.status(404).json({ error: 'Doca não encontrada.' });

    // Validate permission: Collaborators can ONLY pause/resume their own dock
    if (userId) {
      const caller = db.collaborators.find(c => c.id === userId);
      if (caller && !caller.isAdmin && !caller.isMaster) {
        if (!caller.assignedDock || caller.assignedDock.toLowerCase() !== dock.name.toLowerCase()) {
          return res.status(403).json({
            error: `Acesso negado: como colaborador, você só pode pausar ou retomar a sua própria doca (${caller.assignedDock || 'Nenhuma'}). Apenas administradores e o usuário master podem controlar todas as docas.`
          });
        }
      }
    }

    if (dock.status === 'paused' || dock.isPaused) {
      // Resume dock
      dock.status = 'free';
      dock.isPaused = false;
      dock.pausedReason = null;
      dock.pausedAt = null;
    } else {
      // Pause dock
      if (dock.status === 'calling' || dock.status === 'occupied') {
        return res.status(400).json({
          error: `A ${dock.name} possui um veículo em atendimento (${dock.currentDriverName || 'Motorista'}). Finalize ou libere a doca antes de pausar.`
        });
      }
      dock.status = 'paused';
      dock.isPaused = true;
      dock.pausedReason = reason || 'Pausa';
      dock.pausedAt = new Date().toISOString();
    }

    saveDb();
    broadcastEvent('docks_updated', db.docks);
    res.json({ success: true, dock });
  });

  // Active call announcement
  app.get('/api/active-call', (_req: Request, res: Response) => {
    res.json(db.activeCallAnnouncement);
  });

  // Export CSV of any daily sheet
  app.get('/api/daily-sheets/:date/csv', (req: Request, res: Response) => {
    const { date } = req.params;
    const list = db.dailySheets[date] || [];

    const headers = [
      'Senha',
      'Nome do Motorista',
      'Placa',
      'Rota',
      'Cidade',
      'Chegada',
      'Prioritário',
      'Doca',
      'Qtd Pacotes',
      'Número da Isca',
      'Colaborador Doca',
      'Status Presença GPS',
      'Status Operação',
      'Chamado às',
      'Concluído às',
      'Observações',
    ];

    const rows = list.map(item => [
      item.ticketNumber,
      `"${(item.driverName || '').replace(/"/g, '""')}"`,
      item.licensePlate,
      `"${(item.route || '').replace(/"/g, '""')}"`,
      `"${(item.city || '').replace(/"/g, '""')}"`,
      item.arrivalTime,
      item.isPriority ? 'SIM' : 'NÃO',
      item.assignedDock || '',
      item.packageCount !== null && item.packageCount !== undefined ? item.packageCount : '',
      `"${(item.iscaNumber || '').replace(/"/g, '""')}"`,
      `"${(item.collectorName || item.collectorDock ? `${item.collectorName || ''} (${item.collectorDock || ''})` : '').replace(/"/g, '""')}"`,
      item.locationStatus === 'validated_base' ? 'Na Base' : item.locationStatus === 'outside_base' ? 'Fora da Base' : 'Sem GPS',
      item.status,
      item.calledAt ? item.calledAt.slice(11, 19) : '',
      item.completedAt ? item.completedAt.slice(11, 19) : '',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="e2e_docas_planilha_${date}.csv"`);
    res.send(csvContent);
  });

  // --- CHAT EM TEMPO REAL: COLABORADORES DAS DOCAS <-> ADM ---
  app.get('/api/chat/messages', (req: Request, res: Response) => {
    if (!db.messages) db.messages = [];
    const dock = req.query.dock as string | undefined;
    if (dock) {
      const filtered = db.messages.filter(
        m => !m.targetDock || m.targetDock === dock || m.senderDock === dock
      );
      return res.json(filtered);
    }
    res.json(db.messages);
  });

  app.post('/api/chat/messages', (req: Request, res: Response) => {
    if (!db.messages) db.messages = [];
    const { senderId, senderName, senderRole, senderDock, targetDock, content, isUrgent } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Conteúdo da mensagem não pode ser vazio.' });
    }

    const now = new Date();
    const newMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: senderId || 'anonymous',
      senderName: senderName || 'Colaborador',
      senderRole: senderRole || 'colaborador',
      senderDock: senderDock || null,
      targetDock: targetDock || null,
      content: content.trim(),
      timestamp: now.getTime(),
      createdAtFormatted: now.toTimeString().slice(0, 8),
      isUrgent: Boolean(isUrgent),
    };

    db.messages.push(newMessage);
    if (db.messages.length > 300) {
      db.messages = db.messages.slice(-300);
    }
    saveDb();

    broadcastEvent('chat_message', newMessage);
    res.json({ success: true, message: newMessage });
  });

  app.delete('/api/chat/messages', (_req: Request, res: Response) => {
    db.messages = [];
    saveDb();
    broadcastEvent('chat_cleared', {});
    res.json({ success: true });
  });

  // --- MOVIMENTAÇÃO DE PACOTES ENTRE ROTAS (COM ALERTA E OBSERVAÇÃO) ---
  app.get('/api/packages/movements', (_req: Request, res: Response) => {
    if (!db.packageMovements) db.packageMovements = [];
    res.json(db.packageMovements);
  });

  app.post('/api/packages/movements', (req: Request, res: Response) => {
    const {
      sourceRoute,
      targetRoute,
      packageCount,
      trackingCode,
      notes,
      collaboratorName,
      collaboratorDock,
    } = req.body;

    if (!targetRoute || !String(targetRoute).trim()) {
      return res.status(400).json({ error: 'A rota de destino é obrigatória.' });
    }
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ error: 'A observação da movimentação é obrigatória.' });
    }

    const now = new Date();
    const count = Number(packageCount) > 0 ? Number(packageCount) : 1;
    const cleanTarget = String(targetRoute).trim().toUpperCase();

    const movement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sourceRoute: sourceRoute ? String(sourceRoute).trim().toUpperCase() : 'Pátio / Expedição',
      targetRoute: cleanTarget,
      packageCount: count,
      trackingCode: trackingCode ? String(trackingCode).trim() : null,
      notes: String(notes).trim(),
      collaboratorName: collaboratorName || 'Colaborador',
      collaboratorDock: collaboratorDock || null,
      timestamp: now.getTime(),
      createdAtFormatted: now.toTimeString().slice(0, 8),
    };

    if (!db.packageMovements) db.packageMovements = [];
    db.packageMovements.unshift(movement);
    if (db.packageMovements.length > 200) {
      db.packageMovements = db.packageMovements.slice(0, 200);
    }

    // Atualiza a planilha de hoje se houver check-in para a rota destino
    const todayList = getTodaySheet();
    let updatedCheckIn: any = null;

    const matchedCheckIn = todayList.find(c => 
      c.route?.toUpperCase() === cleanTarget ||
      c.route?.toUpperCase().includes(cleanTarget) ||
      c.assignedDock?.toUpperCase() === cleanTarget
    );

    if (matchedCheckIn) {
      matchedCheckIn.packageCount = (matchedCheckIn.packageCount || 0) + count;
      const moveNote = `[+${count} pct movimentado por ${movement.collaboratorName}: ${movement.notes}]`;
      matchedCheckIn.notes = matchedCheckIn.notes 
        ? `${matchedCheckIn.notes} | ${moveNote}` 
        : moveNote;
      updatedCheckIn = matchedCheckIn;
      broadcastEvent('checkin_updated', matchedCheckIn);
    }

    // Registra alerta automático no chat operacional das docas
    const chatAlert = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: 'sistema-pacotes',
      senderName: movement.collaboratorName,
      senderRole: 'colaborador' as const,
      senderDock: movement.collaboratorDock || null,
      targetDock: null,
      content: `📦 [ALERTA DE MOVIMENTAÇÃO] ${count} pacote(s) adicionado(s) para a rota ${cleanTarget}! Observação: "${movement.notes}"`,
      timestamp: now.getTime(),
      createdAtFormatted: now.toTimeString().slice(0, 8),
      isUrgent: true,
    };
    db.messages.push(chatAlert);
    if (db.messages.length > 300) db.messages = db.messages.slice(-300);

    saveDb();

    broadcastEvent('package_moved', { movement, updatedCheckIn });
    broadcastEvent('chat_message', chatAlert);

    res.json({ success: true, movement, updatedCheckIn });
  });

  // --- CONSULTA DE CEP (ViaCEP com Inferência de Rota DF & Entorno) ---
  app.get('/api/cep/:cep', async (req: Request, res: Response) => {
    const rawCep = (req.params.cep || '').replace(/\D/g, '');
    if (rawCep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido. Deve conter exatamente 8 dígitos numéricos.' });
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      if (!response.ok) {
        return res.status(502).json({ error: 'Falha ao conectar com o serviço dos Correios / ViaCEP.' });
      }

      const data = await response.json();
      if (data.erro) {
        return res.status(404).json({ error: `CEP ${rawCep} não encontrado na base oficial dos Correios.` });
      }

      // Inferência Inteligente de Rota Logística DF & Entorno
      let suggestedRoute = 'Rota Especial / Demais Regiões';
      let suggestedRouteCode = 'ESPECIAL';
      let suggestedZone = data.uf === 'DF' ? 'DF' : 'Entorno';

      const searchStr = `${data.bairro || ''} ${data.localidade || ''} ${data.logradouro || ''}`.toLowerCase();

      if (searchStr.includes('ceilândia') || searchStr.includes('ceilandia') || searchStr.includes('sol nascente') || searchStr.includes('setor o') || searchStr.includes('p norte') || searchStr.includes('p sul') || searchStr.includes('guariroba') || searchStr.includes('qnm') || searchStr.includes('qnn')) {
        suggestedRoute = '16A - Ceilândia Centro, Sul & P Sul';
        suggestedRouteCode = '16A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('gama') || searchStr.includes('ponte alta') || searchStr.includes('dvo') || searchStr.includes('setor leste') || searchStr.includes('setor sul')) {
        suggestedRoute = '01A - Gama Centro, Leste & Sul';
        suggestedRouteCode = '01A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('taguatinga') || searchStr.includes('areal') || searchStr.includes('pistão') || searchStr.includes('qnl') || searchStr.includes('qnj')) {
        suggestedRoute = '02A - Taguatinga Norte & Centro';
        suggestedRouteCode = '02A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('samambaia')) {
        suggestedRoute = '03A - Samambaia Norte & Sul';
        suggestedRouteCode = '03A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('asa sul') || searchStr.includes('asa norte') || searchStr.includes('plano piloto') || (data.localidade === 'Brasília' && (searchStr.includes('esplanada') || searchStr.includes('eixo') || searchStr.includes('monumental')))) {
        suggestedRoute = '04A - Plano Piloto (Asa Sul & Asa Norte)';
        suggestedRouteCode = '04A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('lago sul') || searchStr.includes('lago norte') || searchStr.includes('sudoeste') || searchStr.includes('noroeste') || searchStr.includes('octogonal') || searchStr.includes('cruzeiro')) {
        suggestedRoute = '04B - Plano Piloto (Lago Sul, Lago Norte & Sudoeste)';
        suggestedRouteCode = '04B';
        suggestedZone = 'DF';
      } else if (searchStr.includes('santa maria') || searchStr.includes('total ville') || searchStr.includes('santos dumont') || searchStr.includes('polo jk')) {
        suggestedRoute = '05A - Santa Maria Centro & Sul';
        suggestedRouteCode = '05A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('águas claras') || searchStr.includes('aguas claras') || searchStr.includes('arniqueira')) {
        suggestedRoute = '06A - Águas Claras & Arniqueira';
        suggestedRouteCode = '06A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('guará') || searchStr.includes('guara') || searchStr.includes('sia') || searchStr.includes('scia') || searchStr.includes('estrutural')) {
        suggestedRoute = '07A - Guará I, II & SIA / SCIA';
        suggestedRouteCode = '07A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('recanto das emas')) {
        suggestedRoute = '08A - Recanto das Emas';
        suggestedRouteCode = '08A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('riacho fundo')) {
        suggestedRoute = '08B - Riacho Fundo I & II';
        suggestedRouteCode = '08B';
        suggestedZone = 'DF';
      } else if (searchStr.includes('sobradinho') || searchStr.includes('fercal') || searchStr.includes('grande colorado')) {
        suggestedRoute = '09A - Sobradinho I, II & Fercal';
        suggestedRouteCode = '09A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('planaltina') && data.uf === 'DF') {
        suggestedRoute = '10A - Planaltina DF & Arapoanga';
        suggestedRouteCode = '10A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('são sebastião') || searchStr.includes('sao sebastiao') || searchStr.includes('jardim botânico') || searchStr.includes('mangueiral')) {
        suggestedRoute = '11A - São Sebastião & Jardim Botânico';
        suggestedRouteCode = '11A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('vicente pires')) {
        suggestedRoute = '12A - Vicente Pires & Colônia Agrícola';
        suggestedRouteCode = '12A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('brazlândia') || searchStr.includes('brazlandia') || searchStr.includes('incra')) {
        suggestedRoute = '13A - Brazlândia & Incra';
        suggestedRouteCode = '13A';
        suggestedZone = 'DF';
      } else if (searchStr.includes('valparaíso') || searchStr.includes('valparaiso') || searchStr.includes('céu azul') || searchStr.includes('anhanguera')) {
        suggestedRoute = '14A - Valparaíso de Goiás (Etapa A/B & Céu Azul)';
        suggestedRouteCode = '14A';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('cidade ocidental') || searchStr.includes('jardim abc')) {
        suggestedRoute = '14B - Cidade Ocidental & Jardim ABC';
        suggestedRouteCode = '14B';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('novo gama') || searchStr.includes('pedregal') || searchStr.includes('lago azul') || searchStr.includes('lunabel')) {
        suggestedRoute = '15A - Novo Gama & Pedregal';
        suggestedRouteCode = '15A';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('luziânia') || searchStr.includes('luziania') || searchStr.includes('jardim ingá')) {
        suggestedRoute = '17A - Luziânia Centro & Jardim Ingá';
        suggestedRouteCode = '17A';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('águas lindas') || searchStr.includes('aguas lindas')) {
        suggestedRoute = '18A - Águas Lindas de Goiás';
        suggestedRouteCode = '18A';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('santo antônio do descoberto') || searchStr.includes('santo antonio do descoberto')) {
        suggestedRoute = '19A - Santo Antônio do Descoberto';
        suggestedRouteCode = '19A';
        suggestedZone = 'Entorno';
      } else if (searchStr.includes('formosa') || (searchStr.includes('planaltina') && data.uf === 'GO')) {
        suggestedRoute = '20A - Formosa & Planaltina de Goiás';
        suggestedRouteCode = '20A';
        suggestedZone = 'Entorno';
      }

      res.json({
        ...data,
        suggestedRoute,
        suggestedRouteCode,
        suggestedZone,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao buscar CEP: ' + err.message });
    }
  });

  // Setup Vite in Dev or Static in Production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`E2E - DOCAS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start E2E - DOCAS server:', err);
});
