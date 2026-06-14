import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';

const TABS = [
  { id: 'historial', label: 'Historial de Análisis' },
  { id: 'registrar', label: 'Registrar Análisis' },
  { id: 'interpretacion', label: 'Interpretación y Recomendación' }
];

export default function SoilAnalysis() {
  const [activeTab, setActiveTab] = useState('historial');
  const [lots, setLots] = useState({});
  const [analysisList, setAnalysisList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [selectedLotId, setSelectedLotId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [ph, setPh] = useState('6.0');
  const [organicMatter, setOrganicMatter] = useState('3.0');
  const [nitrogen, setNitrogen] = useState('15');
  const [phosphorus, setPhosphorus] = useState('10');
  const [potassium, setPotassium] = useState('110');
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Expose detail view for selected report
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setAnalysisList(data.soil_analysis || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (SoilAnalysis):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const lotList = Object.values(lots);
  const analyses = Object.values(analysisList);

  // Set default lot and selected analysis once loaded
  useEffect(() => {
    if (lotList.length > 0 && !selectedLotId) {
      setSelectedLotId(lotList[0].id);
    }
    if (analyses.length > 0 && !selectedAnalysisId) {
      setSelectedAnalysisId(analyses[0].id);
    }
  }, [lots, analysisList]);

  // Handle PDF drag/drop simulation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("Únicamente se permiten archivos PDF.");
        return;
      }
      setPdfFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB"
      });
    }
  };

  const handleSaveAnalysis = (e) => {
    e.preventDefault();
    if (!selectedLotId || !date || !ph || !organicMatter || !nitrogen || !phosphorus || !potassium) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);
    const selectedLot = lots[selectedLotId];
    const lotName = selectedLot ? selectedLot.name : "Lote Desconocido";

    const saRef = ref(db, 'soil_analysis');
    const newSaRef = push(saRef);
    const id = newSaRef.key;

    const newAnalysis = {
      id,
      lotId: selectedLotId,
      lotName,
      date,
      ph: parseFloat(ph),
      organicMatter: parseFloat(organicMatter),
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
      pdfName: pdfFile ? pdfFile.name : "Sin archivo PDF adjunto",
      pdfSize: pdfFile ? pdfFile.size : "",
      createdAt: new Date().toISOString()
    };

    set(newSaRef, newAnalysis)
      .then(() => {
        alert("¡Análisis de suelo registrado exitosamente!");
        setSubmitting(false);
        setPdfFile(null);
        setSelectedAnalysisId(id);
        setActiveTab('interpretacion');
      })
      .catch(err => {
        console.error(err);
        alert("Error al registrar análisis en Firebase.");
        setSubmitting(false);
      });
  };

  // Interpretation Rules Engine
  const interpretAnalysis = (sa) => {
    if (!sa) return null;
    const diagnostics = {
      ph: { class: '', desc: '' },
      mo: { class: '', desc: '' },
      n: { class: '', desc: '' },
      p: { class: '', desc: '' },
      k: { class: '', desc: '' },
      recommendations: []
    };

    // pH Rules
    if (sa.ph < 5.2) {
      diagnostics.ph.class = 'Muy Ácido (Crítico)';
      diagnostics.ph.desc = 'Suelo fuertemente descalcificado. Alta solubilidad de metales tóxicos como Aluminio y Manganeso.';
      diagnostics.recommendations.push({
        type: 'Acidez',
        action: 'Enmienda Caliza',
        recipe: 'Aplicar 1,200 kg/ha de Cal Agrícola (Carbonato de Calcio) antes de la labor de siembra para elevar el pH y neutralizar el Aluminio activo.'
      });
    } else if (sa.ph >= 5.2 && sa.ph <= 5.7) {
      diagnostics.ph.class = 'Moderadamente Ácido';
      diagnostics.ph.desc = 'Adecuado para el cultivo de Cañihua, pero se recomienda monitorear niveles de Calcio y Magnesio.';
      diagnostics.recommendations.push({
        type: 'Acidez',
        action: 'Encalado de Mantenimiento',
        recipe: 'Aplicar dosis preventivas de dolomita (~300 kg/ha) si se evidencia deficiencia de Magnesio.'
      });
    } else if (sa.ph >= 5.8 && sa.ph <= 6.8) {
      diagnostics.ph.class = 'Ligeramente Ácido (Óptimo)';
      diagnostics.ph.desc = 'Condición ideal y óptima para la disponibilidad y asimilación de nutrientes esenciales por la Cañihua.';
    } else if (sa.ph >= 6.9 && sa.ph <= 7.5) {
      diagnostics.ph.class = 'Neutro';
      diagnostics.ph.desc = 'Excelente balance químico. pH equilibrado.';
    } else {
      diagnostics.ph.class = 'Alcalino (Riesgo)';
      diagnostics.ph.desc = 'Suelo básico. Puede haber limitación severa de micronutrientes (Hierro, Zinc, Cobre) y precipitación de Fósforo.';
      diagnostics.recommendations.push({
        type: 'Alcalinidad',
        action: 'Corrector pH',
        recipe: 'Adicionar Azufre elemental (200-300 kg/ha) o materia orgánica ácida (turba) para bajar paulatinamente el pH.'
      });
    }

    // Materia Orgánica Rules
    if (sa.organicMatter < 1.5) {
      diagnostics.mo.class = 'Bajo (Deficiente)';
      diagnostics.mo.desc = 'Fertilidad física comprometida. Poca retención de humedad y escasa reserva biológica de nutrientes.';
      diagnostics.recommendations.push({
        type: 'Materia Orgánica',
        action: 'Incorporación Orgánica',
        recipe: 'Incorporar de 10 a 15 toneladas/ha de compost maduro o estiércol de oveja deshidratado incorporado a 15 cm de profundidad.'
      });
    } else if (sa.organicMatter >= 1.5 && sa.organicMatter <= 3.5) {
      diagnostics.mo.class = 'Medio';
      diagnostics.mo.desc = 'Rango estándar óptimo para suelos áridos altiplánicos de producción de Cañihua.';
      diagnostics.recommendations.push({
        type: 'Materia Orgánica',
        action: 'Mantenimiento Orgánico',
        recipe: 'Aplicar 3 a 5 toneladas/ha de compost maduro anualmente para conservar la estructura del suelo.'
      });
    } else {
      diagnostics.mo.class = 'Alto (Excelente)';
      diagnostics.mo.desc = 'Excelente capacidad de intercambio catiónico, retención de agua y estabilidad de agregados.';
    }

    // Nitrogen Rules (Sufficiency target: 18 ppm)
    if (sa.nitrogen < 18) {
      diagnostics.n.class = 'Bajo (Deficiencia)';
      diagnostics.n.desc = 'Nivel insuficiente para un crecimiento vegetativo vigoroso y macollamiento foliar óptimo.';
      diagnostics.recommendations.push({
        type: 'Nitrógeno',
        action: 'Fertilización Nitrogenada',
        recipe: 'Dosificar 80 kg/ha de Nitrógeno real. Emplear fertilizantes de liberación controlada o estiércol compostado de corral.'
      });
    } else {
      diagnostics.n.class = 'Suficiente';
      diagnostics.n.desc = 'Disponibilidad de nitrógeno adecuada para suplir la demanda del cultivo.';
    }

    // Phosphorus Rules (Sufficiency target: 12 ppm)
    if (sa.phosphorus < 12) {
      diagnostics.p.class = 'Bajo (Deficiencia)';
      diagnostics.p.desc = 'Fósforo limitado. Se compromete el desarrollo temprano de raíces y el llenado del grano.';
      diagnostics.recommendations.push({
        type: 'Fósforo',
        action: 'Fosfatación de Fondo',
        recipe: 'Aplicar 60 kg/ha de P₂O₅ usando Roca Fosfórica (suelos ácidos) o Superfosfato Triple de Calcio.'
      });
    } else {
      diagnostics.p.class = 'Suficiente';
      diagnostics.p.desc = 'Nivel de Fósforo adecuado para el correcto anclaje y floración.';
    }

    // Potassium Rules (Sufficiency target: 110 ppm)
    if (sa.potassium < 110) {
      diagnostics.k.class = 'Bajo (Deficiencia)';
      diagnostics.k.desc = 'Potasio bajo. Plantas susceptibles a estrés por heladas y sequía comunes en el altiplano.';
      diagnostics.recommendations.push({
        type: 'Potasio',
        action: 'Abonado Potásico',
        recipe: 'Adicionar 50 kg/ha de K₂O empleando Sulfato de Potasio. El potasio aumenta la resistencia celular a bajas temperaturas.'
      });
    } else {
      diagnostics.k.class = 'Suficiente';
      diagnostics.k.desc = 'Correcta osmorregulación y tolerancia frente a heladas andinas.';
    }

    // Default maintenance advice if everything is OK
    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push({
        type: 'Mantenimiento General',
        action: 'Abonado Preventivo',
        recipe: 'Suelo equilibrado químicamente. Mantener dosis mínimas de mantenimiento de compost orgánico (3 ton/ha) y conservar prácticas de rotación.'
      });
    }

    return diagnostics;
  };

  const selectedSa = saListFilteredOrAll() ? saListFilteredOrAll().find(a => a.id === selectedAnalysisId) : null;
  const saDiagnosis = interpretAnalysis(selectedSa);

  function saListFilteredOrAll() {
    return analyses;
  }

  return (
    <div>
      {/* Header */}
      <div style={styles.header} className="view-header">
        <div>
          <h1 style={styles.title} className="view-title">Módulo de Análisis de Suelo</h1>
          <p style={styles.subtitle} className="view-subtitle">Gestión de laboratorios de fertilidad andina, interpretación automatizada y recomendaciones de dosificación</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
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
          <span>Sincronizando reportes de laboratorio...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: HISTORIAL DE ANÁLISIS */}
          {activeTab === 'historial' && (
            <div>
              <h3 style={styles.sectionTitle}>Historial Analítico del Suelo</h3>
              <div className="card">
                <div style={styles.tableContainer} className="view-table-container">
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Lote / Sector</th>
                        <th style={styles.th}>Fecha Análisis</th>
                        <th style={styles.th}>pH</th>
                        <th style={styles.th}>Materia Orgánica</th>
                        <th style={styles.th}>N - P - K (ppm)</th>
                        <th style={styles.th}>Reporte PDF</th>
                        <th style={styles.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyses.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay análisis registrados.
                          </td>
                        </tr>
                      ) : (
                        analyses.reverse().map(sa => (
                          <tr key={sa.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{sa.lotName}</td>
                            <td style={styles.td}>{sa.date}</td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>{sa.ph}</td>
                            <td style={styles.td}>{sa.organicMatter}%</td>
                            <td style={styles.td}>
                              <code>{sa.nitrogen} - {sa.phosphorus} - {sa.potassium}</code>
                            </td>
                            <td style={styles.td}>
                              {sa.pdfName && sa.pdfName !== "Sin archivo PDF adjunto" ? (
                                <span style={{ color: 'var(--tertiary)', fontWeight: 500, fontSize: '12.5px' }}>
                                  📄 {sa.pdfName} ({sa.pdfSize || 'N/A'})
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin archivo</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => {
                                  setSelectedAnalysisId(sa.id);
                                  setActiveTab('interpretacion');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Ver Diagnóstico
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRAR ANÁLISIS */}
          {activeTab === 'registrar' && (
            <div style={styles.formSplitGrid} className="view-form-split-grid">
              <div style={{ flex: 1.2 }}>
                <h3 style={styles.sectionTitle}>Ingresar Resultados de Laboratorio</h3>
                <div className="card" style={{ padding: '24px' }}>
                  <form onSubmit={handleSaveAnalysis}>
                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="lotSelect">Lote Muestreado</label>
                        <select
                          className="form-input"
                          id="lotSelect"
                          value={selectedLotId}
                          onChange={(e) => setSelectedLotId(e.target.value)}
                        >
                          {lotList.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({l.variety})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="analysisDate">Fecha Análisis</label>
                        <input
                          className="form-input"
                          type="date"
                          id="analysisDate"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="phInput">Nivel pH</label>
                        <input
                          className="form-input"
                          type="number"
                          step="0.1"
                          id="phInput"
                          required
                          value={ph}
                          onChange={(e) => setPh(e.target.value)}
                          placeholder="Ej. 6.2"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="moInput">Materia Orgánica (%)</label>
                        <input
                          className="form-input"
                          type="number"
                          step="0.1"
                          id="moInput"
                          required
                          value={organicMatter}
                          onChange={(e) => setOrganicMatter(e.target.value)}
                          placeholder="Ej. 2.5"
                        />
                      </div>
                    </div>

                    <div style={styles.row} className="view-form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="nInput">Nitrógeno (N, ppm)</label>
                        <input
                          className="form-input"
                          type="number"
                          id="nInput"
                          required
                          value={nitrogen}
                          onChange={(e) => setNitrogen(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="pInput">Fósforo (P, ppm)</label>
                        <input
                          className="form-input"
                          type="number"
                          id="pInput"
                          required
                          value={phosphorus}
                          onChange={(e) => setPhosphorus(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="kInput">Potasio (K, ppm)</label>
                        <input
                          className="form-input"
                          type="number"
                          id="kInput"
                          required
                          value={potassium}
                          onChange={(e) => setPotassium(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* PDF upload zone simulation */}
                    <div className="form-group">
                      <label className="form-label">Adjuntar Reporte PDF de Laboratorio</label>
                      <div style={styles.dropZone}>
                        <input
                          type="file"
                          id="pdfFileInput"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          style={styles.fileInput}
                        />
                        <label htmlFor="pdfFileInput" style={styles.dropZoneLabel}>
                          <span style={{ fontSize: '24px' }}>📄</span>
                          {pdfFile ? (
                            <span style={{ color: 'var(--tertiary)', fontWeight: 600 }}>
                              Archivo seleccionado: {pdfFile.name} ({pdfFile.size})
                            </span>
                          ) : (
                            <span>Haga clic para seleccionar o arrastre el archivo PDF del análisis químico</span>
                          )}
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '16px' }}
                      disabled={submitting}
                    >
                      {submitting ? 'Guardando reporte...' : 'Guardar y Calcular Interpretación'}
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ flex: 1 }} className="view-guide-panel">
                <h3 style={styles.sectionTitle}>Rangos Críticos de Cañihua</h3>
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--tertiary-container)', border: '1px solid var(--tertiary)' }}>
                  <h4 style={{ ...styles.cardTitle, color: 'var(--tertiary-dark)' }}>Parámetros de Suficiencia</h4>
                  <p style={styles.guideText}>
                    La Cañihua es un cultivo rústico andino, pero para maximizar el rendimiento por hectárea, el suelo debe aproximarse a los siguientes valores óptimos:
                  </p>
                  <ul style={styles.guideList}>
                    <li><strong>pH Óptimo:</strong> Entre 5.8 y 6.8. Tolera acidez moderada, pero pH &lt; 5.2 bloquea absorción y genera fitotoxicidad de metales.</li>
                    <li><strong>Materia Orgánica:</strong> Rango ideal &gt; 2.5% para garantizar estructura andina y retención hídrica de heladas.</li>
                    <li><strong>Nitrógeno (N):</strong> &gt; 18 ppm. Clave para el macollamiento y crecimiento de tallos.</li>
                    <li><strong>Fósforo (P):</strong> &gt; 12 ppm. Vital para el anclaje inicial de raíces en el altiplano.</li>
                    <li><strong>Potasio (K):</strong> &gt; 110 ppm. Regula la presión osmótica de las células foliares frente a heladas extremas.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERPRETACION Y RECOMENDACION */}
          {activeTab === 'interpretacion' && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Diagnóstico Químico Automatizado</h3>
                <div>
                  <label htmlFor="saSelect" style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>Seleccionar Reporte:</label>
                  <select
                    id="saSelect"
                    value={selectedAnalysisId}
                    onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', display: 'inline-block', padding: '6px 12px' }}
                  >
                    {analyses.map(sa => (
                      <option key={sa.id} value={sa.id}>{sa.lotName} — {sa.date}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSa && saDiagnosis ? (
                <div style={styles.diagnosticGrid}>
                  {/* Left Column: Diagnostics Cards */}
                  <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                      <h4 style={{ ...styles.cardTitle, marginBottom: '20px' }}>Resultados del Laboratorio</h4>
                      <div style={styles.resultsGrid}>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>pH Suelo</span>
                          <span style={styles.resultValue}>{selectedSa.ph}</span>
                          <span className="badge badge-cosecha" style={{ fontSize: '10px', marginTop: '6px' }}>
                            {saDiagnosis.ph.class}
                          </span>
                          <p style={styles.resultDesc}>{saDiagnosis.ph.desc}</p>
                        </div>

                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Mat. Orgánica</span>
                          <span style={styles.resultValue}>{selectedSa.organicMatter}%</span>
                          <span className="badge badge-procesamiento" style={{ fontSize: '10px', marginTop: '6px' }}>
                            {saDiagnosis.mo.class}
                          </span>
                          <p style={styles.resultDesc}>{saDiagnosis.mo.desc}</p>
                        </div>
                      </div>

                      <div style={{ ...styles.resultsGrid, marginTop: '24px' }}>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Nitrógeno (N)</span>
                          <span style={styles.resultValue}>{selectedSa.nitrogen} ppm</span>
                          <span className={`badge ${selectedSa.nitrogen >= 18 ? 'badge-cosecha' : 'badge-siembra'}`} style={{ fontSize: '10px', marginTop: '6px' }}>
                            {saDiagnosis.n.class}
                          </span>
                          <p style={styles.resultDesc}>{saDiagnosis.n.desc}</p>
                        </div>

                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Fósforo (P)</span>
                          <span style={styles.resultValue}>{selectedSa.phosphorus} ppm</span>
                          <span className={`badge ${selectedSa.phosphorus >= 12 ? 'badge-cosecha' : 'badge-siembra'}`} style={{ fontSize: '10px', marginTop: '6px' }}>
                            {saDiagnosis.p.class}
                          </span>
                          <p style={styles.resultDesc}>{saDiagnosis.p.desc}</p>
                        </div>

                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Potasio (K)</span>
                          <span style={styles.resultValue}>{selectedSa.potassium} ppm</span>
                          <span className={`badge ${selectedSa.potassium >= 110 ? 'badge-cosecha' : 'badge-siembra'}`} style={{ fontSize: '10px', marginTop: '6px' }}>
                            {saDiagnosis.k.class}
                          </span>
                          <p style={styles.resultDesc}>{saDiagnosis.k.desc}</p>
                        </div>
                      </div>

                      {selectedSa.pdfName && selectedSa.pdfName !== "Sin archivo PDF adjunto" && (
                        <div style={styles.pdfAttachmentBox}>
                          <span>Documento Original: <strong>{selectedSa.pdfName}</strong> ({selectedSa.pdfSize || 'N/A'})</span>
                          <a href="#" onClick={(e) => { e.preventDefault(); alert("Descargando PDF simulado..."); }} style={styles.pdfLink}>Descargar Reporte PDF</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Fertilizer recipe */}
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.sectionTitle}>Receta de Fertilización</h3>
                    <div className="card" style={{ padding: '24px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}>
                      <h4 style={{ ...styles.cardTitle, color: '#d46b08', marginBottom: '16px' }}>Plan de Abonado Sugerido</h4>
                      <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        En base a las deficiencias detectadas frente a los umbrales de suficiencia del cultivo de Cañihua, aplique las siguientes enmiendas:
                      </p>
                      <div style={styles.recipeList}>
                        {saDiagnosis.recommendations.map((rec, i) => (
                          <div key={i} style={styles.recipeItem}>
                            <span style={styles.recipeTag}>{rec.action}</span>
                            <p style={styles.recipeText}>{rec.recipe}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Seleccione un reporte de laboratorio para visualizar su diagnóstico e interpretación automática.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '28px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  errorBanner: {
    padding: '16px',
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    borderRadius: 'var(--radius-md)',
    marginBottom: '24px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--outline)',
    marginBottom: '32px',
    overflowX: 'auto',
    paddingBottom: '1px',
  },
  tabLink: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  tabLinkActive: {
    color: 'var(--primary)',
    fontWeight: 600,
    borderBottomColor: 'var(--primary)',
  },
  loaderContainer: {
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
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '16px',
    fontFamily: 'var(--font-headline)',
  },
  formSplitGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  row: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    flexWrap: 'wrap'
  },
  guideText: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  guideList: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    paddingLeft: '20px',
    lineHeight: '1.7',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    '&:hover': {
      backgroundColor: 'rgba(108, 47, 0, 0.01)',
    }
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  dropZone: {
    border: '2px dashed var(--outline)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    textAlign: 'center',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  fileInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  dropZoneLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  diagnosticGrid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  resultsGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  resultItem: {
    flex: 1,
    minWidth: '130px',
    padding: '16px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  resultLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  resultValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  resultDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '8px',
    lineHeight: '1.4',
  },
  pdfAttachmentBox: {
    marginTop: '20px',
    borderTop: '1px solid var(--outline)',
    paddingTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  pdfLink: {
    color: 'var(--primary)',
    fontWeight: 600,
    textDecoration: 'none',
    borderBottom: '1.5px solid var(--primary)',
  },
  recipeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  recipeItem: {
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #ffe58f',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recipeTag: {
    alignSelf: 'flex-start',
    fontSize: '10px',
    backgroundColor: '#fff7e6',
    color: '#d46b08',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  recipeText: {
    fontSize: '12.5px',
    color: 'var(--text-primary)',
    lineHeight: '1.5',
    margin: 0,
  }
};
