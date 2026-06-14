import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'fertilizacion', label: 'Nutrición y Fertilización' },
  { id: 'registrar-fert', label: 'Registrar Fertilización' },
  { id: 'mip', label: 'Manejo Integrado de Plagas' },
  { id: 'registrar-mip', label: 'Registrar Monitoreo' }
];

const FERTILIZERS = [
  { name: 'Urea (46-0-0)', n: 0.46, p: 0.0, k: 0.0 },
  { name: 'Fosfato Diamónico (18-46-0)', n: 0.18, p: 0.46, k: 0.0 },
  { name: 'Sulfato de Potasio (0-0-50)', n: 0.0, p: 0.0, k: 0.50 },
  { name: 'Guano de Isla (12-10-2)', n: 0.12, p: 0.10, k: 0.02 },
  { name: 'Compost Orgánico (2-1-2)', n: 0.02, p: 0.01, k: 0.02 }
];

const APPLICATION_METHODS = ['Al Voleo', 'Localizado', 'Foliar', 'Fertirriego'];
const PEST_TYPES = ['Plaga', 'Enfermedad', 'Maleza'];
const INFESTATION_LEVELS = ['Bajo', 'Medio', 'Alto'];
const EVALUATIONS = ['Pendiente', 'Excelente', 'Bueno', 'Insuficiente'];

export default function CropProtection() {
  const [activeTab, setActiveTab] = useState('fertilizacion');
  const [lots, setLots] = useState({});
  const [fertilizations, setFertilizates] = useState({});
  const [pests, setPests] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Fertilización states
  const [selectedLotId, setSelectedLotId] = useState('');
  const [fertDate, setFertDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedFertIdx, setSelectedFertIdx] = useState('3'); // Default Guano de Isla
  const [dose, setDose] = useState(''); // kg/ha
  const [method, setMethod] = useState('Al Voleo');
  const [cost, setCost] = useState('');
  const [submittingFert, setSubmittingFert] = useState(false);

  // Form MIP states
  const [mipLotId, setMipLotId] = useState('');
  const [mipDate, setMipDate] = useState(new Date().toISOString().substring(0, 10));
  const [pestType, setPestType] = useState('Plaga');
  const [pestName, setPestName] = useState('');
  const [infestation, setInfestation] = useState('Bajo');
  const [alertStatus, setAlertStatus] = useState('Activa');
  const [treatment, setTreatment] = useState('');
  const [evaluation, setEvaluation] = useState('Pendiente');
  const [submittingMIP, setSubmittingMIP] = useState(false);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setFertilizates(data.crop_fertilizations || {});
        setPests(data.crop_pests || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (CropProtection):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prepopulate lot dropdowns once loaded
  useEffect(() => {
    const lotKeys = Object.keys(lots);
    if (lotKeys.length > 0) {
      if (!selectedLotId) setSelectedLotId(lotKeys[0]);
      if (!mipLotId) setMipLotId(lotKeys[0]);
    }
  }, [lots]);

  const fertList = Object.values(fertilizations).sort((a, b) => new Date(b.date) - new Date(a.date));
  const pestList = Object.values(pests).sort((a, b) => new Date(b.date) - new Date(a.date));
  const activeAlerts = pestList.filter(p => p.alert === 'Activa');

  const handleSaveFertilizacion = (e) => {
    e.preventDefault();
    if (!selectedLotId || !fertDate || !dose || !cost) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (Number(dose) <= 0 || Number(cost) <= 0) {
      alert("La dosis y el costo deben ser números positivos.");
      return;
    }

    setSubmittingFert(true);

    const lotName = lots[selectedLotId]?.name || 'Lote Desconocido';
    const lotArea = lots[selectedLotId]?.area || 1;
    const fertInfo = FERTILIZERS[Number(selectedFertIdx)];

    // Calculate applied nutrients (dose in kg/ha * lotArea * concentration)
    const nApplied = parseFloat((parseFloat(dose) * lotArea * fertInfo.n).toFixed(1));
    const pApplied = parseFloat((parseFloat(dose) * lotArea * fertInfo.p).toFixed(1));
    const kApplied = parseFloat((parseFloat(dose) * lotArea * fertInfo.k).toFixed(1));

    const fertsRef = ref(db, 'crop_fertilizations');
    const newFertRef = push(fertsRef);
    const id = newFertRef.key;

    const newRecord = {
      id,
      lotId: selectedLotId,
      lotName,
      date: fertDate,
      fertilizer: fertInfo.name,
      dose: parseFloat(dose),
      method,
      cost: parseFloat(cost),
      costPerHa: parseFloat((parseFloat(cost) / lotArea).toFixed(2)),
      nApplied,
      pApplied,
      kApplied,
      createdAt: new Date().toISOString()
    };

    set(newFertRef, newRecord)
      .then(() => {
        alert("¡Fertilización registrada exitosamente!");
        setDose('');
        setCost('');
        setSubmittingFert(false);
        setActiveTab('fertilizacion');
      })
      .catch((err) => {
        console.error(err);
        alert("Error al registrar la fertilización.");
        setSubmittingFert(false);
      });
  };

  const handleSaveMIP = (e) => {
    e.preventDefault();
    if (!mipLotId || !mipDate || !pestName || !treatment) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    setSubmittingMIP(true);
    const lotName = lots[mipLotId]?.name || 'Lote Desconocido';

    const pestsRef = ref(db, 'crop_pests');
    const newPestRef = push(pestsRef);
    const id = newPestRef.key;

    const newRecord = {
      id,
      lotId: mipLotId,
      lotName,
      date: mipDate,
      type: pestType,
      name: pestName,
      infestation,
      alert: alertStatus,
      treatment,
      evaluation,
      createdAt: new Date().toISOString()
    };

    set(newPestRef, newRecord)
      .then(() => {
        alert("¡Monitoreo MIP registrado exitosamente!");
        setPestName('');
        setTreatment('');
        setEvaluation('Pendiente');
        setSubmittingMIP(false);
        setActiveTab('mip');
      })
      .catch((err) => {
        console.error(err);
        alert("Error al registrar el monitoreo.");
        setSubmittingMIP(false);
      });
  };

  const handleResolveAlert = (pestId, newEval) => {
    const pestRef = ref(db, `crop_pests/${pestId}`);
    update(pestRef, {
      alert: 'Inactiva',
      evaluation: newEval
    })
      .then(() => {
        alert("¡Alerta resuelta y evaluación registrada!");
      })
      .catch(err => console.error(err));
  };

  // KPIs
  const totalFertilizationCost = fertList.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalN = fertList.reduce((sum, f) => sum + (f.nApplied || 0), 0);
  const totalP = fertList.reduce((sum, f) => sum + (f.pApplied || 0), 0);
  const totalK = fertList.reduce((sum, f) => sum + (f.kApplied || 0), 0);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando datos de protección y nutrición...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h3>Error al cargar datos</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Protección y Nutrición de Cultivos</h1>
          <p style={styles.subtitle} className="view-subtitle">Gestión de fertilización de precisión y Manejo Integrado de Plagas (MIP)</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabsContainer} className="view-tabs-container">
        <div style={styles.tabs} className="view-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={styles.contentCard}>
        {activeTab === 'fertilizacion' && (
          <div>
            {/* KPIs */}
            <div style={styles.kpiGrid} className="view-kpi-grid">
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Costo Nutrición Acumulado</span>
                <span style={styles.kpiValue}>${totalFertilizationCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                <span style={styles.kpiDesc}>Inversión total en fertilizantes</span>
              </div>
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Nutrientes Aplicados (N)</span>
                <span style={styles.kpiValue}>{totalN.toFixed(1)} kg</span>
                <span style={styles.kpiDesc}>Nitrógeno absorbido</span>
              </div>
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Fósforo (P) y Potasio (K)</span>
                <span style={styles.kpiValue}>{totalP.toFixed(1)}P / {totalK.toFixed(1)}K kg</span>
                <span style={styles.kpiDesc}>Nutrientes macronutrientes aplicados</span>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Historial de Fertilizaciones</h2>
            {fertList.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No se han registrado fertilizaciones.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('registrar-fert')} style={{ marginTop: '12px' }}>
                  Registrar Primera Aplicación
                </button>
              </div>
            ) : (
              <div style={styles.tableContainer} className="view-table-container">
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRowHead}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Lote</th>
                      <th style={styles.th}>Fertilizante</th>
                      <th style={styles.th}>Método</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Dosis ($kg/ha$)</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Costo</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Costo/Ha</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Nutrientes (N-P-K kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fertList.map(fert => (
                      <tr key={fert.id} style={styles.tableRowBody}>
                        <td style={styles.td}>{fert.date}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{fert.lotName}</td>
                        <td style={styles.td}>{fert.fertilizer}</td>
                        <td style={styles.td}>{fert.method}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{fert.dose} kg/ha</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>${(fert.cost || 0).toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', color: 'var(--text-muted)' }}>
                          ${(fert.costPerHa !== undefined ? fert.costPerHa : ((fert.cost || 0) / (lots[fert.lotId]?.area || 1))).toFixed(2)} /ha
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500, color: 'var(--tertiary)' }}>
                          {fert.nApplied !== undefined ? fert.nApplied : '0'}-{fert.pApplied !== undefined ? fert.pApplied : '0'}-{fert.kApplied !== undefined ? fert.kApplied : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrar-fert' && (
          <div style={styles.formSplitGrid} className="view-form-split-grid">
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Registrar Aplicación de Fertilizante</h2>
              <form onSubmit={handleSaveFertilizacion} style={styles.form}>
                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Lote Asociado *</label>
                    <select
                      value={selectedLotId}
                      onChange={(e) => setSelectedLotId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(lots).map(([id, lot]) => (
                        <option key={id} value={id}>{lot.name} ({lot.area} ha)</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Insumo / Fertilizante *</label>
                    <select
                      value={selectedFertIdx}
                      onChange={(e) => setSelectedFertIdx(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {FERTILIZERS.map((f, idx) => (
                        <option key={idx} value={idx}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Fecha de Aplicación *</label>
                    <input
                      type="date"
                      value={fertDate}
                      onChange={(e) => setFertDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Método de Aplicación *</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {APPLICATION_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Dosis Requerida ($kg/ha$) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      placeholder="Ej: 150"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Costo del Insumo ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="Ej: 180"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingFert}>
                    {submittingFert ? 'Registrando...' : 'Registrar Fertilización'}
                  </button>
                </div>
              </form>
            </div>

            <div style={styles.guidePanel} className="view-guide-panel">
              <h3 style={styles.guideTitle}>Pautas de Nutrición Orgánica</h3>
              <ul style={styles.guideList}>
                <li>
                  <strong>Guano de Isla:</strong> Fertilizante nitrogenado natural de alta efectividad. Contiene nutrientes esenciales y mejora la macroestructura del suelo.
                </li>
                <li>
                  <strong>Compost Orgánico:</strong> Suple materia orgánica y macro/micronutrientes a tasas de liberación lenta. Excelente para la microbiota.
                </li>
                <li>
                  <strong>Fertirriego:</strong> Aplicación líquida del fertilizante disuelto a través del sistema de riego por goteo, garantizando una absorción directa y localizada.
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'mip' && (
          <div style={styles.formSplitGrid} className="view-form-split-grid">
            {/* Alerts & List */}
            <div style={{ flex: 1.5, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Bitácora de Monitoreos MIP</h2>
              {pestList.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No se han registrado monitoreos sanitarios.</p>
                </div>
              ) : (
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Lote</th>
                        <th style={styles.th}>Tipo</th>
                        <th style={styles.th}>Patógeno / Maleza</th>
                        <th style={styles.th}>Infestación</th>
                        <th style={styles.th}>Alerta</th>
                        <th style={styles.th}>Eficacia Tratamiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pestList.map(pest => (
                        <tr key={pest.id} style={styles.tableRowBody}>
                          <td style={styles.td}>{pest.date}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{pest.lotName}</td>
                          <td style={styles.td}>{pest.type}</td>
                          <td style={styles.td}>{pest.name}</td>
                          <td style={styles.td}>
                            <span style={{
                              fontWeight: 600,
                              color: pest.infestation === 'Alto' ? 'var(--error)' : pest.infestation === 'Medio' ? '#d46b08' : 'var(--tertiary)'
                            }}>
                              {pest.infestation}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              backgroundColor: pest.alert === 'Activa' ? 'var(--error-container)' : 'var(--outline)',
                              color: pest.alert === 'Activa' ? 'var(--error)' : 'var(--text-muted)'
                            }}>
                              {pest.alert}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {pest.evaluation === 'Pendiente' && pest.alert === 'Activa' ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleResolveAlert(pest.id, 'Excelente')}
                                  style={{ ...styles.btnMini, backgroundColor: '#f6ffed', color: '#389e0d' }}
                                >
                                  Exc
                                </button>
                                <button
                                  onClick={() => handleResolveAlert(pest.id, 'Bueno')}
                                  style={{ ...styles.btnMini, backgroundColor: '#e6f7ff', color: '#0050b3' }}
                                >
                                  Bno
                                </button>
                                <button
                                  onClick={() => handleResolveAlert(pest.id, 'Insuficiente')}
                                  style={{ ...styles.btnMini, backgroundColor: '#fff1f0', color: '#cf1322' }}
                                >
                                  Ins
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 500 }}>{pest.evaluation}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active Alerts Panel */}
            <div style={styles.guidePanel} className="view-guide-panel">
              <h3 style={styles.guideTitle}>🚨 Alertas Sanitarias Activas ({activeAlerts.length})</h3>
              {activeAlerts.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cultivos sanos. No hay alertas fitosanitarias activas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeAlerts.map(alertItem => (
                    <div key={alertItem.id} style={styles.alertCard}>
                      <span style={styles.alertLot}>{alertItem.lotName}</span>
                      <span style={styles.alertName}>{alertItem.name} ({alertItem.type})</span>
                      <div style={styles.alertTreatment}>
                        <strong>Tratamiento:</strong> {alertItem.treatment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'registrar-mip' && (
          <div style={styles.formSplitGrid} className="view-form-split-grid">
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Registrar Monitoreo de Plagas / Enfermedades</h2>
              <form onSubmit={handleSaveMIP} style={styles.form}>
                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Lote Monitoreado *</label>
                    <select
                      value={mipLotId}
                      onChange={(e) => setMipLotId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(lots).map(([id, lot]) => (
                        <option key={id} value={id}>{lot.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Tipo de Incidencia *</label>
                    <select
                      value={pestType}
                      onChange={(e) => setPestType(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {PEST_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Fecha *</label>
                    <input
                      type="date"
                      value={mipDate}
                      onChange={(e) => setMipDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Nombre Común del Patógeno / Plaga / Maleza *</label>
                    <input
                      type="text"
                      value={pestName}
                      onChange={(e) => setPestName(e.target.value)}
                      placeholder="Ej: Polilla de la Cañihua (Kcona-Kcona)"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Nivel de Infestación *</label>
                    <select
                      value={infestation}
                      onChange={(e) => setInfestation(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {INFESTATION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Estado de Alerta *</label>
                    <select
                      value={alertStatus}
                      onChange={(e) => setAlertStatus(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="Activa">Alerta Activa (Requiere Acción)</option>
                      <option value="Inactiva">Sin Alerta (Control preventivo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Tratamiento / Acción Aplicada *</label>
                  <textarea
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Escriba los detalles del biocontrolador o control mecánico aplicado"
                    style={{ ...styles.input, height: '80px', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingMIP}>
                    {submittingMIP ? 'Guardando...' : 'Registrar Monitoreo MIP'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--outline)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '28px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '4px 0 0 0',
  },
  tabsContainer: {
    borderBottom: '1px solid var(--outline)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tabButton: {
    padding: '12px 20px',
    fontSize: '13.5px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
    fontWeight: 600,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--outline)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  kpiCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  kpiDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  sectionTitle: {
    fontSize: '18px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
    marginBottom: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
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
    backgroundColor: 'rgba(108, 47, 0, 0.02)',
  },
  th: {
    padding: '14px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  tableRowBody: {
    borderBottom: '1px solid var(--outline)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
  },
  formSplitGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    flexWrap: 'wrap',
  },
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    outline: 'none',
    backgroundColor: 'var(--bg-primary)',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
    outline: 'none',
    backgroundColor: 'var(--bg-primary)',
    height: '40px',
  },
  guidePanel: {
    flex: '0 0 320px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
  },
  guideTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--primary)',
    margin: '0 0 12px 0',
  },
  guideList: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    lineHeight: '1.5',
  },
  btnMini: {
    border: 'none',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  alertCard: {
    padding: '12px',
    backgroundColor: 'var(--error-container)',
    border: '1px solid rgba(186, 26, 26, 0.15)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  alertLot: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--error)',
    textTransform: 'uppercase',
  },
  alertName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  alertTreatment: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
    gap: '16px',
    color: 'var(--text-muted)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--primary-light)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '24px',
    backgroundColor: 'var(--error-container)',
    color: 'var(--error)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  }
};
