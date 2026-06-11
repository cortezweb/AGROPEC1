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
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

const MOCK_LOTS = {
  'lot-1': {
    id: 'lot-1',
    name: 'Lote Canaviri C-01',
    variety: 'Cupilapaca',
    area: 3.2,
    status: 'Cosecha',
    plantingDate: '2026-02-15',
    targetHumidity: 60,
    targetTemp: 12,
    currentHumidity: 58.4,
    currentTemp: 12.8,
    createdAt: '2026-02-15T08:00:00.000Z'
  },
  'lot-2': {
    id: 'lot-2',
    name: 'Lote Canaviri C-02',
    variety: 'Lasti',
    area: 1.8,
    status: 'Crecimiento',
    plantingDate: '2026-03-10',
    targetHumidity: 70,
    targetTemp: 14,
    currentHumidity: 68.2,
    currentTemp: 13.9,
    createdAt: '2026-03-10T09:30:00.000Z'
  },
  'lot-3': {
    id: 'lot-3',
    name: 'Lote Canaviri C-03',
    variety: 'Saihua',
    area: 2.5,
    status: 'Siembra',
    plantingDate: '2026-05-20',
    targetHumidity: 65,
    targetTemp: 15,
    currentHumidity: 64.0,
    currentTemp: 15.2,
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
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveView('dashboard');
    setSelectedLotId(null);
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
      />
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
      </main>
    </div>
  );
}

export default App;
