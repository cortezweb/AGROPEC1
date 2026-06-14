import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import LotManagement from './views/LotManagement';
import LotDetail from './views/LotDetail';
import Processing from './views/Processing';
import Sales from './views/Sales';
import Staff from './views/Staff';
import Machinery from './views/Machinery';
import IrrigationSystem from './views/IrrigationSystem';
import Warehouse from './views/Warehouse';
import Campaigns from './views/Campaigns';
import SoilAnalysis from './views/SoilAnalysis';
import LandPreparation from './views/LandPreparation';
import CropCycle from './views/CropCycle';
import CropProtection from './views/CropProtection';
import FinanceRentability from './views/FinanceRentability';
import FieldNotebook from './views/FieldNotebook';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

const MOCK_LOTS = {
  'lot-1': {
    id: 'lot-1',
    code: 'LOT-C01',
    name: 'Lote Canaviri C-01',
    variety: 'Cupilapaca',
    area: 3.2,
    status: 'Cosecha',
    plantingDate: '2026-02-15',
    targetHumidity: 60,
    targetTemp: 12,
    currentHumidity: 58.4,
    currentTemp: 12.8,
    producer: 'Mateo Quispe',
    community: 'Comunidad Phuscani',
    gps: '-16.1428, -69.2154',
    altitude: 3820,
    soilType: 'Franco-Arenoso',
    createdAt: '2026-02-15T08:00:00.000Z'
  },
  'lot-2': {
    id: 'lot-2',
    code: 'LOT-C02',
    name: 'Lote Canaviri C-02',
    variety: 'Lasti',
    area: 1.8,
    status: 'Crecimiento',
    plantingDate: '2026-03-10',
    targetHumidity: 70,
    targetTemp: 14,
    currentHumidity: 68.2,
    currentTemp: 13.9,
    producer: 'Lucía Mamani',
    community: 'Comunidad Phuscani',
    gps: '-16.1512, -69.2084',
    altitude: 3815,
    soilType: 'Franco-Arcilloso',
    createdAt: '2026-03-10T09:30:00.000Z'
  },
  'lot-3': {
    id: 'lot-3',
    code: 'LOT-C03',
    name: 'Lote Canaviri C-03',
    variety: 'Saihua',
    area: 2.5,
    status: 'Siembra',
    plantingDate: '2026-05-20',
    targetHumidity: 65,
    targetTemp: 15,
    currentHumidity: 64.0,
    currentTemp: 15.2,
    producer: 'Juan Choque',
    community: 'Comunidad Phuscani',
    gps: '-16.1385, -69.2201',
    altitude: 3830,
    soilType: 'Franco',
    createdAt: '2026-05-20T10:15:00.000Z'
  }
};

const MOCK_ORDERS = {
  'ord-1': {
    id: 'ord-1',
    client: 'Distribuidores Andinos S.A.',
    productName: 'Cañihua en Grano Orgánico',
    quantity: 500,
    totalPrice: 2250.00,
    status: 'Entregado',
    date: '2026-06-01',
    createdAt: '2026-06-01T10:00:00.000Z'
  },
  'ord-2': {
    id: 'ord-2',
    client: 'Supermercados EcoVida',
    productName: 'Harina Integral de Cañihua',
    quantity: 200,
    totalPrice: 1160.00,
    status: 'En tránsito',
    date: '2026-06-04',
    createdAt: '2026-06-04T11:30:00.000Z'
  },
  'ord-3': {
    id: 'ord-3',
    client: 'NutriAlimentos del Sur',
    productName: 'Cañihua Pop (Extruido)',
    quantity: 100,
    totalPrice: 650.00,
    status: 'Preparando',
    date: '2026-06-05',
    createdAt: '2026-06-05T09:15:00.000Z'
  }
};

const MOCK_STAFF = {
  'staff-1': {
    id: 'staff-1',
    name: 'Hamilton Canaviri',
    role: 'Supervisor',
    shift: 'Mañana',
    status: 'En Planta',
    assignedTask: 'Supervisión de Envasado',
    createdAt: '2026-06-01T08:00:00.000Z'
  },
  'staff-2': {
    id: 'staff-2',
    name: 'Mateo Quispe',
    role: 'Agricultor',
    shift: 'Mañana',
    status: 'En Campo',
    assignedTask: 'Riego Lote C-01',
    createdAt: '2026-06-01T08:15:00.000Z'
  },
  'staff-3': {
    id: 'staff-3',
    name: 'Lucía Mamani',
    role: 'Operador de Planta',
    shift: 'Tarde',
    status: 'En Planta',
    assignedTask: 'Operación Secadora R-1',
    createdAt: '2026-06-01T13:45:00.000Z'
  },
  'staff-4': {
    id: 'staff-4',
    name: 'Juan Choque',
    role: 'Logística',
    shift: 'Tarde',
    status: 'Descanso',
    assignedTask: 'Sin tarea asignada',
    createdAt: '2026-06-01T14:00:00.000Z'
  }
};

const MOCK_MACHINERY = {
  'mac-1': {
    id: 'mac-1',
    name: 'Tractor John Deere 5075E',
    hourMeter: 1180,
    nextMaintenance: 1200,
    createdAt: '2026-06-01T08:00:00.000Z'
  },
  'mac-2': {
    id: 'mac-2',
    name: 'Sembradora Neumática de Cañihua',
    hourMeter: 385,
    nextMaintenance: 450,
    createdAt: '2026-06-01T08:15:00.000Z'
  },
  'mac-3': {
    id: 'mac-3',
    name: 'Cosechadora Combinada Class 530',
    hourMeter: 820,
    nextMaintenance: 850,
    createdAt: '2026-06-01T13:45:00.000Z'
  }
};

const MOCK_MACHINE_LOGS = {
  'log-1': {
    id: 'log-1',
    machineId: 'mac-1',
    machineName: 'Tractor John Deere 5075E',
    operator: 'Mateo Quispe',
    labor: 'Preparación de Suelo',
    quarter: 'Cuartel A-1',
    hours: 8,
    fuel: 24,
    date: '2026-06-08',
    createdAt: '2026-06-08T10:00:00.000Z'
  },
  'log-2': {
    id: 'log-2',
    machineId: 'mac-2',
    machineName: 'Sembradora Neumática de Cañihua',
    operator: 'Juan Choque',
    labor: 'Siembra de Grano',
    quarter: 'Cuartel B-2',
    hours: 6,
    fuel: 15,
    date: '2026-06-09',
    createdAt: '2026-06-09T11:30:00.000Z'
  }
};

const MOCK_MACHINE_MAINT = {
  'maint-1': {
    id: 'maint-1',
    machineId: 'mac-1',
    machineName: 'Tractor John Deere 5075E',
    type: 'Preventivo',
    hoursMeter: 950,
    supplies: 'Filtros de aire/combustible, lubricantes',
    cost: 180.00,
    date: '2026-05-15',
    createdAt: '2026-05-15T09:00:00.000Z'
  }
};

const MOCK_MACHINE_INV = {
  'inv-1': {
    id: 'inv-1',
    machineId: 'mac-1',
    machineName: 'Tractor John Deere 5075E',
    invoiceNumber: 'FAC-8493',
    provider: 'Repuestos Agrícolas El Sur',
    concept: 'Compra de filtros de repuesto y aceite hidráulico',
    amount: 180.00,
    date: '2026-05-15',
    createdAt: '2026-05-15T09:05:00.000Z'
  }
};

const MOCK_WEATHER_LIVE = {
  temperature: 14.5,
  humidity: 45,
  rain: 2.4,
  wind: 12.8,
  windDirection: 'NNE',
  lastUpdate: new Date().toISOString()
};

const MOCK_WEATHER_HISTORY = {
  'entry-1': { time: '08:00', temp: 8.5, hum: 65 },
  'entry-2': { time: '10:00', temp: 11.2, hum: 55 },
  'entry-3': { time: '12:00', temp: 14.8, hum: 40 },
  'entry-4': { time: '14:00', temp: 16.5, hum: 38 },
  'entry-5': { time: '16:00', temp: 15.1, hum: 42 },
  'entry-6': { time: '18:00', temp: 13.0, hum: 48 }
};

const MOCK_IRRIGATION_LOGS = {
  'log-1': {
    id: 'log-1',
    lotId: 'lot-1',
    sector: 'Lote Canaviri C-01',
    mmAccumulated: 12.5,
    date: '2026-06-10',
    type: 'Goteo',
    hours: 3,
    caudal: 15,
    waterConsumed: 2700,
    createdAt: '2026-06-10T08:00:00.000Z'
  },
  'log-2': {
    id: 'log-2',
    lotId: 'lot-3',
    sector: 'Lote Canaviri C-03',
    mmAccumulated: 8.0,
    date: '2026-06-11',
    type: 'Aspersión',
    hours: 2,
    caudal: 20,
    waterConsumed: 2400,
    createdAt: '2026-06-11T09:00:00.000Z'
  }
};

const MOCK_IRRIGATION_CONTROLS = {
  'ctrl-1': {
    id: 'ctrl-1',
    lotId: 'lot-1',
    sector: 'Lote Canaviri C-01',
    date: '2026-06-15',
    type: 'Goteo',
    hours: 2,
    caudal: 12,
    waterConsumed: 1440,
    mmAccumulated: 14.4,
    status: 'Programado',
    createdAt: '2026-06-14T08:00:00.000Z'
  }
};

const MOCK_WAREHOUSE_INVENTORY = {
  'item-1': {
    id: 'item-1',
    product: 'Semilla de Cañihua Cupilapaca Seleccionada',
    stock: 250,
    unit: 'Kg',
    warehouse: 'Bodega Principal',
    expiration: '2026-12-15'
  },
  'item-2': {
    id: 'item-2',
    product: 'Fertilizante Orgánico NPK',
    stock: 80,
    unit: 'Sacos (50kg)',
    warehouse: 'Bodega Agroquímicos',
    expiration: '2026-07-05'
  },
  'item-3': {
    id: 'item-3',
    product: 'Filtro de Aceite John Deere',
    stock: 5,
    unit: 'Unidades',
    warehouse: 'Bodega Repuestos',
    expiration: '2030-01-01'
  }
};

const MOCK_WAREHOUSE_MOVEMENTS = {
  'mov-1': {
    id: 'mov-1',
    date: '2026-06-05',
    type: 'Entrada',
    product: 'Fertilizante Orgánico NPK',
    qty: 100,
    unit: 'Sacos (50kg)',
    warehouse: 'Bodega Agroquímicos',
    targetOrSource: 'Proveedor BioSistemas',
    responsible: 'Hamilton Canaviri'
  },
  'mov-2': {
    id: 'mov-2',
    date: '2026-06-08',
    type: 'Salida',
    product: 'Fertilizante Orgánico NPK',
    qty: 20,
    unit: 'Sacos (50kg)',
    warehouse: 'Bodega Agroquímicos',
    targetOrSource: 'Cuartel A-1',
    responsible: 'Mateo Quispe'
  }
};

const MOCK_WAREHOUSE_INVOICES = {
  'fact-1': {
    id: 'fact-1',
    invoiceNumber: 'FAC-5520',
    provider: 'Corporación Semillas Andinas',
    amount: 1250.00,
    status: 'Pendiente',
    date: '2026-06-02'
  },
  'fact-2': {
    id: 'fact-2',
    invoiceNumber: 'FAC-9844',
    provider: 'Repuestos Agrícolas El Sur',
    amount: 340.00,
    status: 'Pagado',
    date: '2026-05-28'
  }
};

const MOCK_CAMPAIGNS = {
  'camp-1': {
    id: 'camp-1',
    name: 'Campaña Cañihua de Invierno',
    season: 'Gestión 2026-I',
    startDate: '2026-02-15',
    endDate: '2026-06-30',
    crop: 'Cañihua Cupilapaca',
    responsible: 'Hamilton Canaviri',
    status: 'Activa'
  },
  'camp-2': {
    id: 'camp-2',
    name: 'Campaña Cañihua de Primavera',
    season: 'Gestión 2026-II',
    startDate: '2026-08-10',
    endDate: '2026-12-20',
    crop: 'Cañihua Lasti',
    responsible: 'Mateo Quispe',
    status: 'Planificada'
  },
  'camp-3': {
    id: 'camp-3',
    name: 'Campaña Piloto Saihua',
    season: 'Gestión 2025-II',
    startDate: '2025-09-01',
    endDate: '2026-01-15',
    crop: 'Cañihua Saihua',
    responsible: 'Lucía Mamani',
    status: 'Finalizada'
  }
};

const MOCK_SOIL_ANALYSIS = {
  'analysis-1': {
    id: 'analysis-1',
    lotId: 'lot-1',
    lotName: 'Lote Canaviri C-01',
    date: '2026-05-10',
    ph: 5.8,
    organicMatter: 3.2,
    nitrogen: 12.0,
    phosphorus: 8.5,
    potassium: 95.0,
    pdfName: 'reporte_quimico_c01.pdf',
    pdfSize: '1.2 MB',
    createdAt: '2026-05-10T14:00:00.000Z'
  },
  'analysis-2': {
    id: 'analysis-2',
    lotId: 'lot-3',
    lotName: 'Lote Canaviri C-03',
    date: '2026-06-01',
    ph: 6.5,
    organicMatter: 4.1,
    nitrogen: 18.5,
    phosphorus: 14.0,
    potassium: 130.0,
    pdfName: 'reporte_lab_c03.pdf',
    pdfSize: '950 KB',
    createdAt: '2026-06-01T10:30:00.000Z'
  }
};

const MOCK_LAND_PREPARATION = {
  'prep-1': {
    id: 'prep-1',
    lotId: 'lot-1',
    lotName: 'Lote Canaviri C-01',
    activityType: 'Arado',
    date: '2026-02-16',
    machineId: 'mac-1',
    machineName: 'Tractor John Deere 5075E',
    operatorId: 'staff-2',
    operatorName: 'Mateo Quispe',
    hours: 8,
    cost: 320.00,
    createdAt: '2026-02-16T10:00:00.000Z'
  },
  'prep-2': {
    id: 'prep-2',
    lotId: 'lot-1',
    lotName: 'Lote Canaviri C-01',
    activityType: 'Rastrado',
    date: '2026-02-18',
    machineId: 'mac-2',
    machineName: 'Sembradora Neumática de Cañihua',
    operatorId: 'staff-4',
    operatorName: 'Juan Choque',
    hours: 6,
    cost: 240.00,
    createdAt: '2026-02-18T14:30:00.000Z'
  },
  'prep-3': {
    id: 'prep-3',
    lotId: 'lot-2',
    lotName: 'Lote Canaviri C-02',
    activityType: 'Subsolado',
    date: '2026-03-12',
    machineId: 'mac-1',
    machineName: 'Tractor John Deere 5075E',
    operatorId: 'staff-2',
    operatorName: 'Mateo Quispe',
    hours: 10,
    cost: 450.00,
    createdAt: '2026-03-12T09:00:00.000Z'
  }
};

const MOCK_CROP_CYCLES = {
  "cycle-1": {
    "id": "cycle-1",
    "lotId": "lot-1",
    "lotName": "Lote Canaviri C-01",
    "plantDate": "2026-02-15",
    "plantMethod": "Mecanizada",
    "variety": "Cupilapaca",
    "seedQty": 40.0,
    "density": 120,
    "germination": 92.0,
    "harvestDate": "2026-06-12",
    "production": 4.8,
    "grainHumidity": 11.5,
    "quality": "Premium",
    "status": "Cosechado",
    "yield": 1.5,
    "createdAt": "2026-02-15T08:00:00.000Z"
  },
  "cycle-2": {
    "id": "cycle-2",
    "lotId": "lot-3",
    "lotName": "Lote Canaviri C-03",
    "plantDate": "2026-05-20",
    "plantMethod": "Manual",
    "variety": "Saihua",
    "seedQty": 30.0,
    "density": 110,
    "germination": 88.0,
    "status": "En Crecimiento",
    "createdAt": "2026-05-20T10:15:00.000Z"
  }
};

const MOCK_CROP_FERTILIZATIONS = {
  "fert-1": {
    "id": "fert-1",
    "lotId": "lot-1",
    "lotName": "Lote Canaviri C-01",
    "date": "2026-03-25",
    "fertilizer": "Compost Orgánico (2-1-2)",
    "dose": 150.0,
    "method": "Al Voleo",
    "cost": 180.0,
    "costPerHa": 56.25,
    "nApplied": 9.6,
    "pApplied": 4.8,
    "kApplied": 9.6,
    "createdAt": "2026-03-25T09:00:00.000Z"
  }
};

const MOCK_CROP_PESTS = {
  "pest-1": {
    "id": "pest-1",
    "lotId": "lot-1",
    "lotName": "Lote Canaviri C-01",
    "date": "2026-04-10",
    "type": "Plaga",
    "name": "Polilla de la Cañihua (Kcona-Kcona)",
    "infestation": "Medio",
    "alert": "Activa",
    "treatment": "Aplicación de biol orgánico y trampas de luz",
    "evaluation": "Bueno",
    "createdAt": "2026-04-10T11:00:00.000Z"
  }
};

const MOCK_STAFF_LOGS = {
  "slog-1": {
    "id": "slog-1",
    "staffId": "staff-2",
    "staffName": "Mateo Quispe",
    "lotId": "lot-1",
    "lotName": "Lote Canaviri C-01",
    "date": "2026-02-15",
    "activity": "Siembra",
    "hours": 8,
    "hourlyRate": 15.0,
    "totalCost": 120.0,
    "createdAt": "2026-02-15T17:00:00.000Z"
  }
};

const MOCK_WAREHOUSE_STORAGE = {
  "store-1": {
    "id": "store-1",
    "name": "Silo Metálico A-1",
    "type": "Grano comercial",
    "stock": 4800,
    "temperature": 12.4,
    "humidity": 11.2,
    "lastUpdate": "2026-06-14T09:00:00.000Z"
  },
  "store-2": {
    "id": "store-2",
    "name": "Bodega Sacos Semilla",
    "type": "Semilla",
    "stock": 250,
    "temperature": 14.1,
    "humidity": 10.5,
    "lastUpdate": "2026-06-14T09:00:00.000Z"
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedLotId, setSelectedLotId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Seed Lots
      const lotsRef = ref(db, 'lots');
      onValue(lotsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Database empty, seeding mock data...");
          set(lotsRef, MOCK_LOTS).catch(err => {
            console.error("Error seeding mock data to Firebase:", err);
          });
        }
      }, {
        onlyOnce: true
      });

      // Seed Orders
      const ordersRef = ref(db, 'orders');
      onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Orders empty, seeding mock orders...");
          set(ordersRef, MOCK_ORDERS).catch(err => {
            console.error("Error seeding mock orders to Firebase:", err);
          });
        }
      }, {
        onlyOnce: true
      });

      // Seed Staff
      const staffRef = ref(db, 'staff');
      onValue(staffRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Staff empty, seeding mock staff...");
          set(staffRef, MOCK_STAFF).catch(err => {
            console.error("Error seeding mock staff to Firebase:", err);
          });
        }
      }, {
        onlyOnce: true
      });

      // Seed Machinery
      const machineryRef = ref(db, 'machinery');
      onValue(machineryRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Machinery empty, seeding mock machinery...");
          set(machineryRef, MOCK_MACHINERY).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Machine Logs
      const machineLogsRef = ref(db, 'machine_logs');
      onValue(machineLogsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(machineLogsRef, MOCK_MACHINE_LOGS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Machine Maintenance
      const machineMaintRef = ref(db, 'machine_maintenance');
      onValue(machineMaintRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(machineMaintRef, MOCK_MACHINE_MAINT).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Machine Invoices
      const machineInvoicesRef = ref(db, 'machine_invoices');
      onValue(machineInvoicesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(machineInvoicesRef, MOCK_MACHINE_INV).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Weather Live
      const weatherLiveRef = ref(db, 'weather_live');
      onValue(weatherLiveRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(weatherLiveRef, MOCK_WEATHER_LIVE).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Weather History
      const weatherHistoryRef = ref(db, 'weather_history');
      onValue(weatherHistoryRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(weatherHistoryRef, MOCK_WEATHER_HISTORY).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Irrigation Logs
      const irrigationLogsRef = ref(db, 'irrigation_logs');
      onValue(irrigationLogsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(irrigationLogsRef, MOCK_IRRIGATION_LOGS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Irrigation Controls
      const irrigationControlsRef = ref(db, 'irrigation_controls');
      onValue(irrigationControlsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(irrigationControlsRef, MOCK_IRRIGATION_CONTROLS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Warehouse Inventory
      const warehouseInventoryRef = ref(db, 'warehouse_inventory');
      onValue(warehouseInventoryRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(warehouseInventoryRef, MOCK_WAREHOUSE_INVENTORY).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Warehouse Movements
      const warehouseMovementsRef = ref(db, 'warehouse_movements');
      onValue(warehouseMovementsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(warehouseMovementsRef, MOCK_WAREHOUSE_MOVEMENTS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Warehouse Invoices
      const warehouseInvoicesRef = ref(db, 'warehouse_invoices');
      onValue(warehouseInvoicesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(warehouseInvoicesRef, MOCK_WAREHOUSE_INVOICES).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Campaigns
      const campaignsRef = ref(db, 'campaigns');
      onValue(campaignsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(campaignsRef, MOCK_CAMPAIGNS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Soil Analysis
      const soilAnalysisRef = ref(db, 'soil_analysis');
      onValue(soilAnalysisRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Soil Analysis empty, seeding mock soil analysis...");
          set(soilAnalysisRef, MOCK_SOIL_ANALYSIS).catch(err => {
            console.error("Error seeding mock soil analysis to Firebase:", err);
          });
        }
      }, { onlyOnce: true });

      // Seed Land Preparation
      const landPrepRef = ref(db, 'land_preparation');
      onValue(landPrepRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Land Preparation empty, seeding mock land preparation...");
          set(landPrepRef, MOCK_LAND_PREPARATION).catch(err => {
            console.error("Error seeding mock land preparation to Firebase:", err);
          });
        }
      }, { onlyOnce: true });

      // Seed Crop Cycles
      const cropCyclesRef = ref(db, 'crop_cycles');
      onValue(cropCyclesRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          console.log("Crop Cycles empty, seeding mock crop cycles...");
          set(cropCyclesRef, MOCK_CROP_CYCLES).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Crop Fertilizations
      const cropFertRef = ref(db, 'crop_fertilizations');
      onValue(cropFertRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(cropFertRef, MOCK_CROP_FERTILIZATIONS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Crop Pests
      const cropPestsRef = ref(db, 'crop_pests');
      onValue(cropPestsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(cropPestsRef, MOCK_CROP_PESTS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Staff Logs
      const staffLogsRef = ref(db, 'staff_logs');
      onValue(staffLogsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(staffLogsRef, MOCK_STAFF_LOGS).catch(err => console.error(err));
        }
      }, { onlyOnce: true });

      // Seed Warehouse Storage
      const warehouseStorageRef = ref(db, 'warehouse_storage');
      onValue(warehouseStorageRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          set(warehouseStorageRef, MOCK_WAREHOUSE_STORAGE).catch(err => console.error(err));
        }
      }, { onlyOnce: true });
    }
  }, [isAuthenticated]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getViewTitle = (view) => {
    switch (view) {
      case 'dashboard': return 'Dashboard';
      case 'lots': return 'Lotes';
      case 'lot-detail': return 'Detalle de Lote';
      case 'campaigns': return 'Campañas';
      case 'soil-analysis': return 'Análisis de Suelo';
      case 'land-preparation': return 'Prep. de Terreno';
      case 'crop-cycle': return 'Siembra y Cosecha';
      case 'crop-protection': return 'Protección y Nutrición';
      case 'field-notebook': return 'Cuaderno de Campo';
      case 'irrigation': return 'Sistema de Riego';
      case 'machinery': return 'Maquinaria';
      case 'staff': return 'Personal';
      case 'warehouse': return 'Bodegas y Stock';
      case 'processing': return 'Procesamiento';
      case 'sales': return 'Ventas';
      case 'finance-rentability': return 'Costos y ROI';
      default: return 'Canaviri';
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveView('dashboard');
    setSelectedLotId(null);
    setIsSidebarOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay open" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Abrir menú">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--primary)', fontSize: '18px' }}>
          {getViewTitle(activeView)}
        </span>
        <div 
          className="mobile-avatar" 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            border: '1px solid var(--primary)'
          }}
        >
          A
        </div>
      </div>
      <main className="main-content">
        {activeView === 'dashboard' && (
          <Dashboard 
            onViewChange={setActiveView} 
            onLotSelect={(id) => {
              setSelectedLotId(id);
              setActiveView('lot-detail');
            }} 
          />
        )}
        {activeView === 'lots' && (
          <LotManagement 
            onLotSelect={(id) => {
              setSelectedLotId(id);
              setActiveView('lot-detail');
            }} 
          />
        )}
        {activeView === 'lot-detail' && (
          <LotDetail 
            lotId={selectedLotId} 
            onBack={() => setActiveView('lots')} 
          />
        )}
        {activeView === 'processing' && (
          <Processing />
        )}
        {activeView === 'sales' && (
          <Sales />
        )}
        {activeView === 'staff' && (
          <Staff />
        )}
        {activeView === 'machinery' && (
          <Machinery />
        )}
        {activeView === 'irrigation' && (
          <IrrigationSystem />
        )}
        {activeView === 'warehouse' && (
          <Warehouse />
        )}
        {activeView === 'campaigns' && (
          <Campaigns />
        )}
        {activeView === 'soil-analysis' && (
          <SoilAnalysis />
        )}
        {activeView === 'land-preparation' && (
          <LandPreparation />
        )}
        {activeView === 'crop-cycle' && (
          <CropCycle />
        )}
        {activeView === 'crop-protection' && (
          <CropProtection />
        )}
        {activeView === 'field-notebook' && (
          <FieldNotebook />
        )}
        {activeView === 'finance-rentability' && (
          <FinanceRentability />
        )}
      </main>

      {/* Barra de Navegación Inferior para Celulares */}
      <div className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Inicio</span>
        </button>
        <button 
          className={`mobile-nav-item ${(activeView === 'lots' || activeView === 'lot-detail') ? 'active' : ''}`}
          onClick={() => setActiveView('lots')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>Lotes</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeView === 'irrigation' ? 'active' : ''}`}
          onClick={() => setActiveView('irrigation')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
          </svg>
          <span>Riego</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeView === 'warehouse' ? 'active' : ''}`}
          onClick={() => setActiveView('warehouse')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          <span>Bodega</span>
        </button>
        <button 
          className={`mobile-nav-item ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>Menú</span>
        </button>
      </div>
    </div>
  );
}

export default App;
