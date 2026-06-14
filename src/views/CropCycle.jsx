import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'historial', label: 'Ciclos de Cultivo' },
  { id: 'siembra', label: 'Registrar Siembra' },
  { id: 'cosecha', label: 'Registrar Cosecha' },
  { id: 'metricas', label: 'Análisis de Rendimiento' }
];

const VARIETIES = ['Cupilapaca', 'Lasti', 'Saihua'];
const PLANT_METHODS = ['Mecanizada', 'Manual'];
const QUALITIES = ['Premium', 'Primera', 'Segunda'];

export default function CropCycle() {
  const [activeTab, setActiveTab] = useState('historial');
  const [cropCycles, setCropCycles] = useState({});
  const [lots, setLots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Siembra states
  const [selectedLotId, setSelectedLotId] = useState('');
  const [plantDate, setPlantDate] = useState(new Date().toISOString().substring(0, 10));
  const [plantMethod, setPlantMethod] = useState('Mecanizada');
  const [variety, setVariety] = useState('Cupilapaca');
  const [seedQty, setSeedQty] = useState('');
  const [density, setDensity] = useState('');
  const [germination, setGermination] = useState('');
  const [submittingSiembra, setSubmittingSiembra] = useState(false);

  // Form Cosecha states
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().substring(0, 10));
  const [production, setProduction] = useState('');
  const [grainHumidity, setGrainHumidity] = useState('');
  const [quality, setQuality] = useState('Premium');
  const [submittingCosecha, setSubmittingCosecha] = useState(false);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setCropCycles(data.crop_cycles || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (CropCycle):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prepopulate default dropdown selections
  useEffect(() => {
    const lotKeys = Object.keys(lots);
    if (lotKeys.length > 0 && !selectedLotId) setSelectedLotId(lotKeys[0]);

    const activeCycles = Object.values(cropCycles).filter(c => c.status === 'En Crecimiento');
    if (activeCycles.length > 0 && !selectedCycleId) setSelectedCycleId(activeCycles[0].id);
  }, [lots, cropCycles]);

  const cycleList = Object.values(cropCycles).sort((a, b) => new Date(b.plantDate) - new Date(a.plantDate));
  const activeCycles = cycleList.filter(c => c.status === 'En Crecimiento');
  const harvestedCycles = cycleList.filter(c => c.status === 'Cosechado');

  const handleSaveSiembra = (e) => {
    e.preventDefault();
    if (!selectedLotId || !plantDate || !plantMethod || !variety || !seedQty || !density || !germination) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (Number(seedQty) <= 0 || Number(density) <= 0 || Number(germination) < 0 || Number(germination) > 100) {
      alert("Por favor ingrese valores numéricos válidos. Germinación debe estar entre 0% y 100%.");
      return;
    }

    setSubmittingSiembra(true);
    const lotName = lots[selectedLotId]?.name || 'Lote Desconocido';

    const cyclesRef = ref(db, 'crop_cycles');
    const newCycleRef = push(cyclesRef);
    const id = newCycleRef.key;

    const newRecord = {
      id,
      lotId: selectedLotId,
      lotName,
      plantDate,
      plantMethod,
      variety,
      seedQty: parseFloat(seedQty),
      density: parseFloat(density),
      germination: parseFloat(germination),
      status: 'En Crecimiento',
      createdAt: new Date().toISOString()
    };

    set(newCycleRef, newRecord)
      .then(() => {
        alert("¡Siembra registrada exitosamente!");
        setSeedQty('');
        setDensity('');
        setGermination('');
        setSubmittingSiembra(false);
        setActiveTab('historial');
      })
      .catch((err) => {
        console.error(err);
        alert("Error al guardar la siembra.");
        setSubmittingSiembra(false);
      });
  };

  const handleSaveCosecha = (e) => {
    e.preventDefault();
    if (!selectedCycleId || !harvestDate || !production || !grainHumidity || !quality) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (Number(production) <= 0 || Number(grainHumidity) < 0) {
      alert("Por favor ingrese valores numéricos positivos.");
      return;
    }

    setSubmittingCosecha(true);
    const cycle = cropCycles[selectedCycleId];
    const lotArea = lots[cycle.lotId]?.area || 1; // Default to 1 to avoid division by zero
    const prodVal = parseFloat(production);
    const yieldCalculated = parseFloat((prodVal / lotArea).toFixed(2)); // t/ha

    const cycleRef = ref(db, `crop_cycles/${selectedCycleId}`);
    const updates = {
      harvestDate,
      production: prodVal,
      grainHumidity: parseFloat(grainHumidity),
      quality,
      status: 'Cosechado',
      yield: yieldCalculated
    };

    update(cycleRef, updates)
      .then(() => {
        alert("¡Cosecha registrada y ciclo finalizado exitosamente!");
        setProduction('');
        setGrainHumidity('');
        setSubmittingCosecha(false);
        setActiveTab('historial');
      })
      .catch((err) => {
        console.error(err);
        alert("Error al guardar la cosecha.");
        setSubmittingCosecha(false);
      });
  };

  // KPIs
  const totalProduction = harvestedCycles.reduce((sum, c) => sum + (Number(c.production) || 0), 0);
  const totalHarvestedArea = harvestedCycles.reduce((sum, c) => sum + (lots[c.lotId]?.area || 0), 0);
  const avgYield = totalHarvestedArea > 0 ? (totalProduction / totalHarvestedArea) : 0;
  const countActive = activeCycles.length;
  const activeArea = activeCycles.reduce((sum, c) => sum + (lots[c.lotId]?.area || 0), 0);

  // SVG Chart Computations
  const maxYield = Math.max(...harvestedCycles.map(c => c.yield || 0), 1);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando ciclos de cultivo...</p>
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
          <h1 style={styles.title} className="view-title">Ciclo de Cultivos</h1>
          <p style={styles.subtitle} className="view-subtitle">Gestión integrada de siembra y cosecha de Cañihua en la Granja Canaviri</p>
        </div>
      </header>

      {/* Navigation Tabs */}
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

      {/* Card Content */}
      <div style={styles.contentCard}>
        {activeTab === 'historial' && (
          <div>
            {/* KPIs */}
            <div style={styles.kpiGrid} className="view-kpi-grid">
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Lotes en Crecimiento</span>
                <span style={styles.kpiValue}>{countActive} lotes</span>
                <span style={styles.kpiDesc}>{activeArea.toFixed(1)} ha sembradas activas</span>
              </div>
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Producción Total</span>
                <span style={styles.kpiValue}>{totalProduction.toFixed(1)} t</span>
                <span style={styles.kpiDesc}>Volumen acumulado cosechado</span>
              </div>
              <div style={styles.kpiCard} className="view-kpi-card">
                <span style={styles.kpiLabel}>Rendimiento Medio</span>
                <span style={styles.kpiValue}>{avgYield.toFixed(2)} t/ha</span>
                <span style={styles.kpiDesc}>Eficiencia promedio por lote</span>
              </div>
            </div>

            {/* Cycles Table */}
            <h2 style={styles.sectionTitle}>Historial de Siembra y Cosecha</h2>
            {cycleList.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay registros de ciclos de cultivos.</p>
              </div>
            ) : (
              <div style={styles.tableContainer} className="view-table-container">
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRowHead}>
                      <th style={styles.th}>Lote</th>
                      <th style={styles.th}>Variedad</th>
                      <th style={styles.th}>Siembra</th>
                      <th style={styles.th}>Densidad ($pl/m^2$)</th>
                      <th style={styles.th}>Germinación</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Cosecha</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Producción</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleList.map(cycle => (
                      <tr key={cycle.id} style={styles.tableRowBody}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{cycle.lotName}</td>
                        <td style={styles.td}>{cycle.variety}</td>
                        <td style={styles.td}>{cycle.plantDate}</td>
                        <td style={styles.td}>{cycle.density}</td>
                        <td style={styles.td}>{cycle.germination}%</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(cycle.status === 'Cosechado' ? styles.badgeHarvested : styles.badgeGrowing)
                          }}>
                            {cycle.status}
                          </span>
                        </td>
                        <td style={styles.td}>{cycle.harvestDate || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                          {cycle.production ? `${cycle.production} t` : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                          {cycle.yield ? `${cycle.yield} t/ha` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'siembra' && (
          <div style={styles.formSplitGrid} className="view-form-split-grid">
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Registrar Nueva Siembra</h2>
              <form onSubmit={handleSaveSiembra} style={styles.form}>
                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Lote *</label>
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
                    <label style={styles.label}>Variedad de Cañihua *</label>
                    <select
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {VARIETIES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Fecha de Siembra *</label>
                    <input
                      type="date"
                      value={plantDate}
                      onChange={(e) => setPlantDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Método de Siembra *</label>
                    <select
                      value={plantMethod}
                      onChange={(e) => setPlantMethod(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {PLANT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row} className="view-form-row">
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={styles.label}>Cantidad de Semilla (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={seedQty}
                      onChange={(e) => setSeedQty(e.target.value)}
                      placeholder="Ej: 40"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={styles.label}>Densidad de Siembra ($pl/m^2$) *</label>
                    <input
                      type="number"
                      min="10"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      placeholder="Ej: 120"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={styles.label}>Tasa de Germinación (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={germination}
                      onChange={(e) => setGermination(e.target.value)}
                      placeholder="Ej: 90"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingSiembra}>
                    {submittingSiembra ? 'Guardando...' : 'Registrar Siembra'}
                  </button>
                </div>
              </form>
            </div>

            <div style={styles.guidePanel} className="view-guide-panel">
              <h3 style={styles.guideTitle}>Estándares de Siembra de Cañihua</h3>
              <ul style={styles.guideList}>
                <li>
                  <strong>Variedad Cupilapaca:</strong> Grano de color marrón oscuro, resistente a heladas intensas. Adecuada para zonas altas de laderas.
                </li>
                <li>
                  <strong>Variedad Saihua:</strong> Porte erecto, color rosáceo/purpúreo. Facilita la cosecha mecanizada.
                </li>
                <li>
                  <strong>Densidad:</strong> Se recomienda una densidad de 100-130 plantas por metro cuadrado para optimizar el tamaño de panoja.
                </li>
                <li>
                  <strong>Semilla por ha:</strong> El estándar óptimo oscila entre 12 a 15 kg por hectárea según la germinación (&gt;85%).
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'cosecha' && (
          <div style={styles.formSplitGrid} className="view-form-split-grid">
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Registrar Cosecha (Cerrar Ciclo)</h2>
              {activeCycles.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No hay lotes activos sembrados actualmente ("En Crecimiento"). Registre una siembra primero.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveCosecha} style={styles.form}>
                  <div style={styles.row} className="view-form-row">
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={styles.label}>Seleccionar Lote Sembrado *</label>
                      <select
                        value={selectedCycleId}
                        onChange={(e) => setSelectedCycleId(e.target.value)}
                        style={styles.select}
                        required
                      >
                        {activeCycles.map(c => (
                          <option key={c.id} value={c.id}>{c.lotName} (Sembrado: {c.plantDate} - {c.variety})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={styles.label}>Calidad Obtenida *</label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        style={styles.select}
                        required
                      >
                        {QUALITIES.map(q => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={styles.row} className="view-form-row">
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={styles.label}>Fecha de Cosecha *</label>
                      <input
                        type="date"
                        value={harvestDate}
                        onChange={(e) => setHarvestDate(e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={styles.label}>Producción Total (t) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={production}
                        onChange={(e) => setProduction(e.target.value)}
                        placeholder="Ej: 4.8"
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={styles.label}>Humedad del Grano (%) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={grainHumidity}
                        onChange={(e) => setGrainHumidity(e.target.value)}
                        placeholder="Ej: 11.5"
                        style={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingCosecha}>
                      {submittingCosecha ? 'Finalizando...' : 'Registrar Cosecha y Cerrar Ciclo'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div style={styles.guidePanel} className="view-guide-panel">
              <h3 style={styles.guideTitle}>Estándares de Calidad en Cosecha</h3>
              <ul style={styles.guideList}>
                <li>
                  <strong>Humedad Óptima:</strong> La humedad para trilla y almacenamiento prolongado debe estar por debajo del 12% para evitar el desarrollo de hongos.
                </li>
                <li>
                  <strong>Rendimiento Esperado:</strong> Un rendimiento de Cañihua de 1.2 a 2.0 t/ha es considerado normal en el altiplano bajo manejo orgánico tradicional.
                </li>
                <li>
                  <strong>Calidad Premium:</strong> Grano con tamaño homogéneo, libre de impurezas mecánicas y con humedad controlada entre 10% y 12%.
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'metricas' && (
          <div style={styles.metricsContainer}>
            <div style={styles.row} className="view-form-row">
              {/* Rendimiento SVG Chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Comparación de Rendimiento por Lote</h3>
                <p style={styles.chartSubtitle}>Rendimiento en Toneladas por Hectárea ($t/ha$)</p>

                <div style={styles.chartWrapper}>
                  {harvestedCycles.length === 0 ? (
                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', padding: '24px 0' }}>
                      No hay datos históricos de cosechas registradas.
                    </p>
                  ) : (
                    harvestedCycles.map(c => {
                      const percentage = ((c.yield || 0) / maxYield) * 100;
                      return (
                        <div key={c.id} style={styles.chartRow}>
                          <span style={{ ...styles.chartRowLabel, width: '150px' }}>{c.lotName} ({c.variety})</span>
                          <div style={styles.chartBarBg}>
                            <div
                              style={{
                                ...styles.chartBarFill,
                                width: `${percentage}%`,
                                backgroundColor: 'var(--primary)'
                              }}
                            ></div>
                          </div>
                          <span style={styles.chartRowValue}>{c.yield.toFixed(2)} t/ha</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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
  badgeGrowing: {
    backgroundColor: '#fff7e6',
    color: '#d46b08',
  },
  badgeHarvested: {
    backgroundColor: '#f6ffed',
    color: '#389e0d',
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
  metricsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  chartCard: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    minWidth: '300px',
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--primary)',
    margin: 0,
  },
  chartSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: '2px 0 16px 0',
  },
  chartWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  chartRowLabel: {
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  chartBarBg: {
    flex: 1,
    height: '14px',
    backgroundColor: 'rgba(135, 115, 105, 0.1)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.6s ease-out',
  },
  chartRowValue: {
    width: '100px',
    textAlign: 'right',
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--primary)',
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
