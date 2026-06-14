import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'faenas', label: 'Faenas de Máquina' },
  { id: 'costo', label: 'Costo por Hora' },
  { id: 'mantenimiento', label: 'Registro de Mantenimiento' },
  { id: 'facturas', label: 'Facturas Asociadas' },
  { id: 'rendimiento', label: 'Reporte de Rendimiento' }
];

export default function Machinery() {
  const [activeTab, setActiveTab] = useState('faenas');
  const [machines, setMachines] = useState({});
  const [logs, setLogs] = useState({});
  const [maintenance, setMaintenance] = useState({});
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal control states
  const [isFaenaModalOpen, setIsFaenaModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Faena form states
  const [faenaMachine, setFaenaMachine] = useState('');
  const [faenaOperator, setFaenaOperator] = useState('');
  const [faenaLabor, setFaenaLabor] = useState('');
  const [faenaQuarter, setFaenaQuarter] = useState('');
  const [faenaHours, setFaenaHours] = useState('');
  const [faenaFuel, setFaenaFuel] = useState('');

  // Maintenance form states
  const [maintMachine, setMaintMachine] = useState('');
  const [maintType, setMaintType] = useState('Preventivo');
  const [maintHours, setMaintHours] = useState('');
  const [maintSupplies, setMaintSupplies] = useState('');
  const [maintCost, setMaintCost] = useState('');

  // Invoice form states
  const [invMachine, setInvMachine] = useState('');
  const [invNumber, setInvNumber] = useState('');
  const [invProvider, setInvProvider] = useState('');
  const [invConcept, setInvConcept] = useState('');
  const [invAmount, setInvAmount] = useState('');

  // Calculator states
  const [calcDep, setCalcDep] = useState('500');
  const [calcFuel, setCalcFuel] = useState('350');
  const [calcMaint, setCalcMaint] = useState('200');
  const [calcHrs, setCalcHrs] = useState('80');
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMachines(data.machinery || {});
        setLogs(data.machine_logs || {});
        setMaintenance(data.machine_maintenance || {});
        setInvoices(data.machine_invoices || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Machinery):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default form values once machines are loaded
  useEffect(() => {
    const list = Object.values(machines);
    if (list.length > 0) {
      if (!faenaMachine) setFaenaMachine(list[0].id);
      if (!maintMachine) setMaintMachine(list[0].id);
      if (!invMachine) setInvMachine(list[0].id);
    }
  }, [machines]);

  const handleSaveFaena = (e) => {
    e.preventDefault();
    if (!faenaHours || !faenaFuel) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    const selectedMachine = machines[faenaMachine];
    const hrs = parseFloat(faenaHours);
    const fuel = parseFloat(faenaFuel);

    const logsRef = ref(db, 'machine_logs');
    const newLogRef = push(logsRef);
    const id = newLogRef.key;

    // Save Faena Log
    set(newLogRef, {
      id,
      machineId: faenaMachine,
      machineName: selectedMachine.name,
      operator: faenaOperator,
      labor: faenaLabor,
      quarter: faenaQuarter,
      hours: hrs,
      fuel: fuel,
      date: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString()
    }).then(() => {
      // Update Machine's current hour meter (horómetro)
      const machineRef = ref(db, `machinery/${faenaMachine}`);
      const updatedHourMeter = (selectedMachine.hourMeter || 0) + hrs;
      update(machineRef, { hourMeter: updatedHourMeter });

      setIsFaenaModalOpen(false);
      setFaenaHours('');
      setFaenaFuel('');
    }).catch(err => {
      console.error("Error saving faena:", err);
      alert("Error al guardar la faena.");
    });
  };

  const handleSaveMaint = (e) => {
    e.preventDefault();
    if (!maintHours || !maintCost) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    const selectedMachine = machines[maintMachine];
    const hrVal = parseFloat(maintHours);
    const costVal = parseFloat(maintCost);

    const maintRef = ref(db, 'machine_maintenance');
    const newMaintRef = push(maintRef);
    const id = newMaintRef.key;

    set(newMaintRef, {
      id,
      machineId: maintMachine,
      machineName: selectedMachine.name,
      type: maintType,
      hoursMeter: hrVal,
      supplies: maintSupplies,
      cost: costVal,
      date: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString()
    }).then(() => {
      // Update next scheduled maintenance (+250 hours)
      const machineRef = ref(db, `machinery/${maintMachine}`);
      update(machineRef, {
        nextMaintenance: hrVal + 250,
        hourMeter: hrVal // Sync current hour meter to the maintenance hour meter
      });

      setIsMaintModalOpen(false);
      setMaintHours('');
      setMaintSupplies('');
      setMaintCost('');
    }).catch(err => {
      console.error("Error saving maintenance:", err);
      alert("Error al guardar mantenimiento.");
    });
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!invNumber || !invAmount) {
      alert("Por favor complete todos los campos.");
      return;
    }

    const selectedMachine = machines[invMachine];
    const amountVal = parseFloat(invAmount);

    const invRef = ref(db, 'machine_invoices');
    const newInvRef = push(invRef);
    const id = newInvRef.key;

    set(newInvRef, {
      id,
      machineId: invMachine,
      machineName: selectedMachine.name,
      invoiceNumber: invNumber,
      provider: invProvider,
      concept: invConcept,
      amount: amountVal,
      date: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsInvoiceModalOpen(false);
      setInvNumber('');
      setInvProvider('');
      setInvConcept('');
      setInvAmount('');
    }).catch(err => {
      console.error("Error saving invoice:", err);
      alert("Error al registrar la factura.");
    });
  };

  const handleCalculateCost = (e) => {
    e.preventDefault();
    const dep = parseFloat(calcDep);
    const fuel = parseFloat(calcFuel);
    const maint = parseFloat(calcMaint);
    const hrs = parseFloat(calcHrs);

    if (hrs <= 0) {
      alert("Las horas trabajadas deben ser mayores a 0.");
      return;
    }

    const result = (dep + fuel + maint) / hrs;
    setCalcResult(result);
  };

  const machineList = Object.values(machines);
  const logList = Object.values(logs);
  const maintList = Object.values(maintenance);
  const invoiceList = Object.values(invoices);

  // Performance computations
  const getPerformanceData = () => {
    return machineList.map(m => {
      const machineLogs = logList.filter(l => l.machineId === m.id);
      const machineMaint = maintList.filter(ma => ma.machineId === m.id);
      const machineInvoices = invoiceList.filter(i => i.machineId === m.id);

      const totalHours = machineLogs.reduce((sum, l) => sum + (l.hours || 0), 0);
      const totalFuelUsed = machineLogs.reduce((sum, l) => sum + (l.fuel || 0), 0);
      const fuelCost = totalFuelUsed * 1.25; // Supposing $1.25 per L of fuel
      
      const maintCost = machineMaint.reduce((sum, ma) => sum + (ma.cost || 0), 0);
      const invoiceCost = machineInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
      
      const deprecationVal = totalHours * 5.5; // Supposing $5.5 depreciaton per hour
      const totalCost = deprecationVal + fuelCost + maintCost + invoiceCost;
      
      // Hectares worked: Supposing 0.8 hectares per hour worked
      const haWorked = totalHours * 0.8;
      
      return {
        ...m,
        totalHours,
        totalCost,
        costPerHr: totalHours > 0 ? (totalCost / totalHours) : 0,
        costPerHa: haWorked > 0 ? (totalCost / haWorked) : 0,
        haWorked
      };
    });
  };

  const performanceList = getPerformanceData();

  return (
    <div>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Módulo de Maquinaria Agrícola</h1>
          <p style={styles.subtitle} className="view-subtitle">Gestión de faenas, control de horómetros, calculadora de costo por hora e historial de mantenimiento</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Hour meter alert banner */}
      {!loading && machineList.some(m => (m.nextMaintenance - m.hourMeter) <= 30) && (
        <div style={styles.maintenanceAlert}>
          <h4 style={{ margin: 0, color: '#735c00' }}>⚠️ Alerta de Mantenimiento Preventivo Pendiente</h4>
          <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            Las siguientes máquinas están próximas a cumplir el horómetro límite para mantenimiento preventivo (+250h desde su último servicio):
          </p>
          <ul style={{ fontSize: '13px', marginTop: '8px', paddingLeft: '20px' }}>
            {machineList
              .filter(m => (m.nextMaintenance - m.hourMeter) <= 30)
              .map(m => (
                <li key={m.id}>
                  <strong>{m.name}:</strong> Horómetro actual: <code>{m.hourMeter} h</code> • Límite programado: <code>{m.nextMaintenance} h</code> (Faltan {m.nextMaintenance - m.hourMeter} horas).
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabsContainer} className="view-tabs-container">
        <div className="view-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabLink,
                ...(activeTab === tab.id ? styles.tabLinkActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Cargando datos de maquinaria...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: FAENAS DE MÁQUINA */}
          {activeTab === 'faenas' && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Registro de Faenas y Consumo</h3>
                <button onClick={() => setIsFaenaModalOpen(true)} className="btn btn-primary">
                  Registrar Nueva Faena
                </button>
              </div>
              
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Máquina</th>
                        <th style={styles.th}>Operario</th>
                        <th style={styles.th}>Labor Realizada</th>
                        <th style={styles.th}>Cuartel / Lote</th>
                        <th style={styles.th}>Horas Trabajadas</th>
                        <th style={styles.th}>Petróleo Consumido</th>
                        <th style={styles.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No hay faenas registradas</td>
                        </tr>
                      ) : (
                        logList.reverse().map(log => (
                          <tr key={log.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{log.machineName}</td>
                            <td style={styles.td}>{log.operator}</td>
                            <td style={styles.td}>{log.labor}</td>
                            <td style={styles.td}>{log.quarter}</td>
                            <td style={styles.td}>{log.hours} hrs</td>
                            <td style={styles.td}>{log.fuel} Litros</td>
                            <td style={styles.td}>{log.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COSTO POR HORA */}
          {activeTab === 'costo' && (
            <div style={styles.calculatorSection}>
              {/* Table of Machine hourly costs */}
              <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={styles.sectionTitle}>Costo Operativo por Máquina</h3>
                <div className="card">
                  <div style={styles.tableContainer} className="view-table-container">
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableRowHead}>
                          <th style={styles.th}>Máquina</th>
                          <th style={styles.th}>Horómetro</th>
                          <th style={styles.th}>Costo por Hora Est.</th>
                          <th style={styles.th}>Estado Mantenimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceList.map(p => (
                          <tr key={p.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                            <td style={styles.td}>{p.hourMeter} hrs</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: 'var(--primary)' }}>
                              ${p.costPerHr > 0 ? p.costPerHr.toFixed(2) : '0.00'} / hr
                            </td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                (p.nextMaintenance - p.hourMeter) <= 30 ? 'badge-siembra' : 'badge-cosecha'
                              }`}>
                                {(p.nextMaintenance - p.hourMeter) <= 30 ? 'Pendiente' : 'Al día'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Cost calculator form */}
              <div style={{ flex: 1 }}>
                <h3 style={styles.sectionTitle}>Calculadora de Tarifa Horaria</h3>
                <div className="card">
                  <form onSubmit={handleCalculateCost}>
                    <div className="form-group">
                      <label className="form-label">Depreciación Fija del Periodo ($)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={calcDep}
                        onChange={(e) => setCalcDep(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Combustible Consumido ($)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={calcFuel}
                        onChange={(e) => setCalcFuel(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Costo de Mantenimiento / Repuestos ($)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={calcMaint}
                        onChange={(e) => setCalcMaint(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Horas Totales Trabajadas (hrs)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={calcHrs}
                        onChange={(e) => setCalcHrs(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                      Calcular Tarifa por Hora
                    </button>
                  </form>

                  {calcResult !== null && (
                    <div style={styles.calcResultBox}>
                      <span style={styles.calcResultLabel}>COSTO HORA MÁQUINA ESTIMADO</span>
                      <span style={styles.calcResultValue}>${calcResult.toFixed(2)} / hora</span>
                      <span style={styles.calcResultFormula}>
                        Fórmula: (Depreciación + Combustible + Mantenimiento) / Horas
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRO MANTENIMIENTO */}
          {activeTab === 'mantenimiento' && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Historial de Servicios y Mantenimiento</h3>
                <button onClick={() => setIsMaintModalOpen(true)} className="btn btn-primary">
                  Registrar Mantenimiento
                </button>
              </div>

              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Máquina</th>
                        <th style={styles.th}>Tipo</th>
                        <th style={styles.th}>Horómetro al Servicio</th>
                        <th style={styles.th}>Insumos Usados</th>
                        <th style={styles.th}>Costo Servicio</th>
                        <th style={styles.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No hay mantenimientos registrados</td>
                        </tr>
                      ) : (
                        maintList.reverse().map(maint => (
                          <tr key={maint.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{maint.machineName}</td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                maint.type === 'Correctivo' ? 'badge-siembra' : 'badge-cosecha'
                              }`}>
                                {maint.type}
                              </span>
                            </td>
                            <td style={styles.td}>{maint.hoursMeter} hrs</td>
                            <td style={styles.td}>{maint.supplies}</td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>${maint.cost?.toFixed(2)}</td>
                            <td style={styles.td}>{maint.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FACTURAS ASOCIADAS */}
          {activeTab === 'facturas' && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Facturas Vinculadas por Máquina</h3>
                <button onClick={() => setIsInvoiceModalOpen(true)} className="btn btn-primary">
                  Vincular Nueva Factura
                </button>
              </div>

              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>N° Factura</th>
                        <th style={styles.th}>Máquina Asociada</th>
                        <th style={styles.th}>Proveedor</th>
                        <th style={styles.th}>Concepto (Repuesto, Servicio)</th>
                        <th style={styles.th}>Monto total</th>
                        <th style={styles.th}>Fecha Emisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No hay facturas vinculadas</td>
                        </tr>
                      ) : (
                        invoiceList.reverse().map(inv => (
                          <tr key={inv.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                            <td style={styles.td}>{inv.machineName}</td>
                            <td style={styles.td}>{inv.provider}</td>
                            <td style={styles.td}>{inv.concept}</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: 'var(--primary)' }}>${inv.amount?.toFixed(2)}</td>
                            <td style={styles.td}>{inv.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REPORTE RENDIMIENTO */}
          {activeTab === 'rendimiento' && (
            <div>
              <h3 style={styles.sectionTitle}>Rendimiento Operativo y Eficiencia</h3>
              
              {/* SVG Performance Chart */}
              <div className="card" style={{ marginBottom: '32px' }}>
                <h4 style={{ ...styles.cardTitle, fontFamily: 'var(--font-headline)' }}>Distribución de Horas y Costos Totales</h4>
                <div style={{ height: '220px', marginTop: '24px' }}>
                  <svg viewBox="0 0 600 180" style={{ width: '100%', height: '100%' }}>
                    {/* Grid */}
                    <line x1="50" y1="20" x2="550" y2="20" stroke="#f0eded" />
                    <line x1="50" y1="70" x2="550" y2="70" stroke="#f0eded" />
                    <line x1="50" y1="120" x2="550" y2="120" stroke="#f0eded" />
                    <line x1="50" y1="150" x2="550" y2="150" stroke="#e4e2e1" strokeWidth="1.5" />

                    {/* Chart Bars */}
                    {performanceList.slice(0, 3).map((item, idx) => {
                      const xBase = 120 + idx * 160;
                      const hrsHeight = Math.min(item.totalHours * 1.5, 110);
                      const costHeight = Math.min(item.totalCost / 35, 110);
                      
                      return (
                        <g key={item.id}>
                          {/* Hours Bar */}
                          <rect 
                            x={xBase} 
                            y={150 - hrsHeight} 
                            width="25" 
                            height={hrsHeight} 
                            fill="var(--tertiary)" 
                            rx="2"
                          />
                          <text x={xBase + 12.5} y={145 - hrsHeight} textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--tertiary)', fontWeight: 600 }}>
                            {item.totalHours}h
                          </text>

                          {/* Cost Bar */}
                          <rect 
                            x={xBase + 35} 
                            y={150 - costHeight} 
                            width="25" 
                            height={costHeight} 
                            fill="var(--primary)" 
                            rx="2"
                          />
                          <text x={xBase + 47.5} y={145 - costHeight} textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--primary)', fontWeight: 600 }}>
                            ${item.totalCost?.toFixed(0)}
                          </text>

                          {/* Machine name */}
                          <text x={xBase + 30} y="166" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: 'var(--text-primary)' }}>
                            {item.name?.substring(0, 15)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Legend */}
                    <rect x="420" y="5" width="12" height="12" fill="var(--tertiary)" rx="2" />
                    <text x="438" y="15" style={{ fontSize: '10px', fill: 'var(--text-muted)' }}>Horas trabajadas</text>
                    <rect x="420" y="25" width="12" height="12" fill="var(--primary)" rx="2" />
                    <text x="438" y="35" style={{ fontSize: '10px', fill: 'var(--text-muted)' }}>Costo Total ($)</text>
                  </svg>
                </div>
              </div>

              {/* Analytical Table */}
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Máquina</th>
                        <th style={styles.th}>Horas Totales</th>
                        <th style={styles.th}>Área de Trabajo Est.</th>
                        <th style={styles.th}>Costo Acumulado</th>
                        <th style={styles.th}>Costo promedio/ha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceList.map(p => (
                        <tr key={p.id} style={styles.tableRowBody}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                          <td style={styles.td}>{p.totalHours} hrs</td>
                          <td style={styles.td}>{p.haWorked.toFixed(1)} ha</td>
                          <td style={{ ...styles.td, fontWeight: 700 }}>${p.totalCost.toFixed(2)}</td>
                          <td style={{ ...styles.td, fontWeight: 700, color: 'var(--tertiary)' }}>
                            ${p.costPerHa > 0 ? p.costPerHa.toFixed(2) : '0.00'} / ha
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAENA CREATION MODAL */}
      {isFaenaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Nueva Faena</h3>
              <button onClick={() => setIsFaenaModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSaveFaena}>
              <div className="form-group">
                <label className="form-label" htmlFor="faenaMachine">Máquina Seleccionada</label>
                <select
                  className="form-input"
                  id="faenaMachine"
                  value={faenaMachine}
                  onChange={(e) => setFaenaMachine(e.target.value)}
                >
                  {machineList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="faenaOperator">Operario de Turno</label>
                <input
                  className="form-input"
                  type="text"
                  id="faenaOperator"
                  required
                  value={faenaOperator}
                  onChange={(e) => setFaenaOperator(e.target.value)}
                  placeholder="Ej. Mateo Quispe"
                />
              </div>

              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="faenaLabor">Labor Realizada</label>
                  <input
                    className="form-input"
                    type="text"
                    id="faenaLabor"
                    required
                    value={faenaLabor}
                    onChange={(e) => setFaenaLabor(e.target.value)}
                    placeholder="Ej. Siembra"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="faenaQuarter">Cuartel / Sector</label>
                  <input
                    className="form-input"
                    type="text"
                    id="faenaQuarter"
                    required
                    value={faenaQuarter}
                    onChange={(e) => setFaenaQuarter(e.target.value)}
                    placeholder="Ej. Cuartel A-1"
                  />
                </div>
              </div>

              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="faenaHours">Horas Trabajadas</label>
                  <input
                    className="form-input"
                    type="number"
                    id="faenaHours"
                    required
                    value={faenaHours}
                    onChange={(e) => setFaenaHours(e.target.value)}
                    placeholder="Ej. 6"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="faenaFuel">Combustible (Lts)</label>
                  <input
                    className="form-input"
                    type="number"
                    id="faenaFuel"
                    required
                    value={faenaFuel}
                    onChange={(e) => setFaenaFuel(e.target.value)}
                    placeholder="Ej. 18"
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsFaenaModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Faena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAINTENANCE CREATION MODAL */}
      {isMaintModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Mantenimiento</h3>
              <button onClick={() => setIsMaintModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSaveMaint}>
              <div className="form-group">
                <label className="form-label" htmlFor="maintMachine">Máquina Asociada</label>
                <select
                  className="form-input"
                  id="maintMachine"
                  value={maintMachine}
                  onChange={(e) => setMaintMachine(e.target.value)}
                >
                  {machineList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maintType">Tipo Mantenimiento</label>
                <select
                  className="form-input"
                  id="maintType"
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                >
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maintHours">Horómetro del Servicio (hrs)</label>
                <input
                  className="form-input"
                  type="number"
                  id="maintHours"
                  required
                  value={maintHours}
                  onChange={(e) => setMaintHours(e.target.value)}
                  placeholder="Ej. 1180"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maintSupplies">Insumos y Repuestos usados</label>
                <input
                  className="form-input"
                  type="text"
                  id="maintSupplies"
                  required
                  value={maintSupplies}
                  onChange={(e) => setMaintSupplies(e.target.value)}
                  placeholder="Ej. Filtro aceite, lubricantes"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maintCost">Costo del Servicio ($)</label>
                <input
                  className="form-input"
                  type="number"
                  id="maintCost"
                  required
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value)}
                  placeholder="Ej. 120"
                />
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsMaintModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE LINK MODAL */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Vincular Factura</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSaveInvoice}>
              <div className="form-group">
                <label className="form-label" htmlFor="invMachine">Máquina Asociada</label>
                <select
                  className="form-input"
                  id="invMachine"
                  value={invMachine}
                  onChange={(e) => setInvMachine(e.target.value)}
                >
                  {machineList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.row} className="view-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="invNumber">N° Factura</label>
                  <input
                    className="form-input"
                    type="text"
                    id="invNumber"
                    required
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    placeholder="Ej. F-948"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="invAmount">Monto total ($)</label>
                  <input
                    className="form-input"
                    type="number"
                    id="invAmount"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="Ej. 340.50"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invProvider">Proveedor</label>
                <input
                  className="form-input"
                  type="text"
                  id="invProvider"
                  required
                  value={invProvider}
                  onChange={(e) => setInvProvider(e.target.value)}
                  placeholder="Ej. Distribuidor John Deere Bolivia"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invConcept">Concepto de Facturación</label>
                <input
                  className="form-input"
                  type="text"
                  id="invConcept"
                  required
                  value={invConcept}
                  onChange={(e) => setInvConcept(e.target.value)}
                  placeholder="Ej. Compra de inyector de petróleo"
                />
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Vincular Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '12px',
    overflowX: 'auto',
  },
  tabLink: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  tabLinkActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    margin: 0,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableRowHead: {
    borderBottom: '2px solid var(--outline)',
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  tableRowBody: {
    borderBottom: '1px solid var(--outline)',
  },
  td: {
    padding: '16px',
    fontSize: '13px',
  },
  calculatorSection: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  calcResultBox: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  calcResultLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  calcResultValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  calcResultFormula: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maintenanceAlert: {
    backgroundColor: '#fffbe6',
    border: '1px solid #ffe58f',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    margin: 0,
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    borderTop: '1px solid var(--outline)',
    paddingTop: '16px',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '64px 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--outline)',
    borderTopColor: 'var(--primary)',
    borderRadius: 'var(--radius-full)',
    animation: 'spin 1s linear infinite',
  },
  errorBanner: {
    backgroundColor: 'var(--error-container)',
    border: '1px solid var(--error)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
  },
};
