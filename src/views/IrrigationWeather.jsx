import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';

const TABS = [
  { id: 'control', label: 'Control de Riego' },
  { id: 'registro', label: 'Historial de Riego' },
  { id: 'estacion', label: 'Estación Meteorológica' },
  { id: 'grafico', label: 'Gráfico Temp vs Hum' }
];

export default function IrrigationWeather() {
  const [activeTab, setActiveTab] = useState('control');
  const [lots, setLots] = useState({});
  const [logs, setLogs] = useState({});
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherHistory, setWeatherHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for control/scheduling
  const [selectedLot, setSelectedLot] = useState('');
  const [irrigationDate, setIrrigationDate] = useState(new Date().toISOString().substring(0, 10));
  const [hours, setHours] = useState('2');
  const [caudal, setCaudal] = useState('15');
  const [method, setMethod] = useState('Goteo');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setLogs(data.irrigation_logs || {});
        setLiveWeather(data.weather_live || null);
        setWeatherHistory(data.weather_history || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (IrrigationWeather):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default lot when lots list changes
  useEffect(() => {
    const lotList = Object.values(lots);
    if (lotList.length > 0 && !selectedLot) {
      setSelectedLot(lotList[0].name);
    }
  }, [lots]);

  const handleSaveControl = (e) => {
    e.preventDefault();
    if (!selectedLot || !hours || !caudal) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    setSubmitting(true);
    const hrsVal = parseFloat(hours);
    const caudalVal = parseFloat(caudal);
    
    // Formula for mm accumulated: (Caudal L/min * 60 * horas) / 100
    // Simulating water spread over a standard plot area
    const mmAccumulated = parseFloat(((caudalVal * 60 * hrsVal) / 100).toFixed(1));

    const logsRef = ref(db, 'irrigation_logs');
    const newLogRef = push(logsRef);
    const id = newLogRef.key;

    const newLog = {
      id,
      sector: selectedLot,
      mmAccumulated,
      date: irrigationDate,
      type: method,
      hours: hrsVal,
      caudal: caudalVal,
      createdAt: new Date().toISOString()
    };

    set(newLogRef, newLog)
      .then(() => {
        // Also save to irrigation_controls for active queue
        const controlRef = ref(db, `irrigation_controls/${id}`);
        set(controlRef, {
          ...newLog,
          status: 'Completado'
        });

        alert("¡Riego programado y ejecutado exitosamente!");
        setHours('2');
        setCaudal('15');
        setSubmitting(false);
        setActiveTab('registro');
      })
      .catch(err => {
        console.error("Error saving irrigation control/log:", err);
        alert("Error al guardar la operación de riego.");
        setSubmitting(false);
      });
  };

  // Simulate refreshing meteorological data from IoT
  const handleRefreshIoT = () => {
    if (!liveWeather) return;
    
    const randomTemp = parseFloat((10 + Math.random() * 10).toFixed(1)); // 10°C to 20°C
    const randomHum = Math.floor(30 + Math.random() * 50); // 30% to 80%
    const randomRain = parseFloat((Math.random() * 5).toFixed(1)); // 0 to 5 mm
    const randomWind = parseFloat((5 + Math.random() * 20).toFixed(1)); // 5 to 25 km/h
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];

    const weatherLiveRef = ref(db, 'weather_live');
    set(weatherLiveRef, {
      temperature: randomTemp,
      humidity: randomHum,
      rain: randomRain,
      wind: randomWind,
      windDirection: randomDir,
      lastUpdate: new Date().toISOString()
    }).then(() => {
      // Append to temporal series to feed the line chart
      const historyRef = ref(db, 'weather_history');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newHistoryKey = push(historyRef).key;
      
      set(ref(db, `weather_history/${newHistoryKey}`), {
        time: timeStr,
        temp: randomTemp,
        hum: randomHum
      });
    }).catch(err => console.error("Error refreshing IoT data:", err));
  };

  const lotList = Object.values(lots);
  const logList = Object.values(logs);
  const historyList = Object.values(weatherHistory);

  // SVG Line Chart Computations
  const renderLineChart = () => {
    if (historyList.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No hay datos históricos suficientes para trazar el gráfico. Refresque los datos en la pestaña de Estación Meteorológica para poblar la base de datos.
        </div>
      );
    }

    // Limit to last 8 entries for visualization
    const chartData = historyList.slice(-8);

    const width = 600;
    const height = 240;
    const paddingLeft = 50;
    const paddingRight = 50;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Ranges
    const temps = chartData.map(d => d.temp);
    const hums = chartData.map(d => d.hum);

    const maxTemp = Math.max(...temps, 25);
    const minTemp = Math.min(...temps, 0);
    const maxHum = Math.max(...hums, 100);
    const minHum = Math.min(...hums, 0);

    const tempRange = maxTemp - minTemp || 1;
    const humRange = maxHum - minHum || 1;

    // Scale helpers
    const getX = (index) => {
      if (chartData.length <= 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (index / (chartData.length - 1)) * chartWidth;
    };

    const getTempY = (val) => {
      return height - paddingBottom - ((val - minTemp) / tempRange) * chartHeight;
    };

    const getHumY = (val) => {
      return height - paddingBottom - ((val - minHum) / humRange) * chartHeight;
    };

    // Draw lines
    let tempPath = "";
    let humPath = "";

    chartData.forEach((d, idx) => {
      const x = getX(idx);
      const tempY = getTempY(d.temp);
      const humY = getHumY(d.hum);

      if (idx === 0) {
        tempPath = `M ${x} ${tempY}`;
        humPath = `M ${x} ${humY}`;
      } else {
        tempPath += ` L ${x} ${tempY}`;
        humPath += ` L ${x} ${humY}`;
      }
    });

    return (
      <div className="card" style={{ padding: '24px' }}>
        <h4 style={{ ...styles.cardTitle, marginBottom: '20px' }}>Tendencia de Sensor IoT (Últimas Lecturas)</h4>
        <div style={{ position: 'relative', width: '100%' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Grid & Axes */}
            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />
            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />
            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />

            {/* Horizontal divisions */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const yVal = paddingTop + r * chartHeight;
              return (
                <line 
                  key={i} 
                  x1={paddingLeft} 
                  y1={yVal} 
                  x2={width - paddingRight} 
                  y2={yVal} 
                  stroke="#f0eded" 
                  strokeDasharray="4 4" 
                />
              );
            })}

            {/* Temp Axes Labels (Left) */}
            <text x={paddingLeft - 10} y={paddingTop + 4} textAnchor="end" style={styles.chartText}>
              {maxTemp.toFixed(0)}°C
            </text>
            <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 4} textAnchor="end" style={styles.chartText}>
              {((maxTemp + minTemp) / 2).toFixed(0)}°C
            </text>
            <text x={paddingLeft - 10} y={height - paddingBottom + 4} textAnchor="end" style={styles.chartText}>
              {minTemp.toFixed(0)}°C
            </text>

            {/* Humidity Axes Labels (Right) */}
            <text x={width - paddingRight + 10} y={paddingTop + 4} textAnchor="start" style={styles.chartText}>
              {maxHum}%
            </text>
            <text x={width - paddingRight + 10} y={paddingTop + chartHeight / 2 + 4} textAnchor="start" style={styles.chartText}>
              {((maxHum + minHum) / 2).toFixed(0)}%
            </text>
            <text x={width - paddingRight + 10} y={height - paddingBottom + 4} textAnchor="start" style={styles.chartText}>
              {minHum}%
            </text>

            {/* Data Lines */}
            {chartData.length > 1 && (
              <>
                <path d={tempPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={humPath} fill="none" stroke="var(--tertiary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {/* Data Dots and Hover Tooltips */}
            {chartData.map((d, idx) => {
              const x = getX(idx);
              const tempY = getTempY(d.temp);
              const humY = getHumY(d.hum);

              return (
                <g key={idx}>
                  {/* Temp Dot */}
                  <circle cx={x} cy={tempY} r="4" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  {/* Hum Dot */}
                  <circle cx={x} cy={humY} r="4" fill="var(--tertiary)" stroke="#ffffff" strokeWidth="1.5" />

                  {/* Time label */}
                  <text x={x} y={height - paddingBottom + 20} textAnchor="middle" style={{ ...styles.chartText, fontWeight: 500 }}>
                    {d.time}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={styles.legendContainer}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--primary)' }}></span>
            <span style={styles.legendLabel}>Temperatura (°C, Eje Izquierdo)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--tertiary)' }}></span>
            <span style={styles.legendLabel}>Humedad Relativa (%, Eje Derecho)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Módulo de Riego y Clima (IoT)</h1>
          <p style={styles.subtitle}>Supervisión de sensores meteorológicos en tiempo real y registro del consumo hídrico del cultivo</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabsContainer}>
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

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Sincronizando con sensores IoT...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: CONTROL DE RIEGO */}
          {activeTab === 'control' && (
            <div style={styles.formContainer}>
              <div style={{ flex: 1.2 }}>
                <h3 style={styles.sectionTitle}>Programación de Operación</h3>
                <div className="card" style={{ padding: '24px' }}>
                  <form onSubmit={handleSaveControl}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="sector">Sector / Lote a Regar</label>
                      <select
                        className="form-input"
                        id="sector"
                        value={selectedLot}
                        onChange={(e) => setSelectedLot(e.target.value)}
                      >
                        {lotList.length > 0 ? (
                          lotList.map(l => (
                            <option key={l.id} value={l.name}>{l.name} ({l.variety})</option>
                          ))
                        ) : (
                          <option value="Lote General">Lote General Canaviri</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="date">Fecha de Ejecución</label>
                      <input
                        className="form-input"
                        type="date"
                        id="date"
                        value={irrigationDate}
                        onChange={(e) => setIrrigationDate(e.target.value)}
                        required
                      />
                    </div>

                    <div style={styles.row}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="hours">Horas de Riego</label>
                        <input
                          className="form-input"
                          type="number"
                          id="hours"
                          min="0.5"
                          step="0.5"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="caudal">Caudal del Emisor (L/min)</label>
                        <input
                          className="form-input"
                          type="number"
                          id="caudal"
                          min="1"
                          value={caudal}
                          onChange={(e) => setCaudal(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="method">Método de Riego</label>
                      <select
                        className="form-input"
                        id="method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        <option value="Goteo">Riego por Goteo (Alta Precisión)</option>
                        <option value="Aspersión">Aspersión Convencional</option>
                        <option value="Fertirriego">Fertirriego (Nutrientes + Riego)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '16px' }}
                      disabled={submitting}
                    >
                      {submitting ? 'Ejecutando Riego...' : 'Programar y Activar Riego'}
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={styles.sectionTitle}>Guía de Recomendación</h3>
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--tertiary-container)', border: '1px solid var(--tertiary)' }}>
                  <h4 style={{ ...styles.cardTitle, color: 'var(--tertiary-dark)' }}>Fórmula de Lámina (mm)</h4>
                  <p style={styles.guideText}>
                    La lámina de agua acumulada expresada en milímetros se calcula usando la siguiente relación:
                  </p>
                  <div style={styles.formulaBox}>
                    <code>mm Acumulados = (Caudal L/min × 60 × Horas) / 100</code>
                  </div>
                  <p style={styles.guideText}>
                    <strong>Recomendación por fase de Cañihua:</strong>
                  </p>
                  <ul style={styles.guideList}>
                    <li><strong>Siembra:</strong> Riego ligero por aspersión (~5-8 mm) para humedecer la cama de semillas sin encharcar.</li>
                    <li><strong>Crecimiento:</strong> Riego por goteo moderado (~10-15 mm) para potenciar el desarrollo radicular.</li>
                    <li><strong>Cosecha/Maduración:</strong> Reducir el riego a niveles mínimos para facilitar la maduración natural del grano.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL DE RIEGO */}
          {activeTab === 'registro' && (
            <div>
              <h3 style={styles.sectionTitle}>Registro Histórico Hídrico</h3>
              <div className="card">
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableRowHead}>
                        <th style={styles.th}>Sector / Lote</th>
                        <th style={styles.th}>Método Riego</th>
                        <th style={styles.th}>Horas Ejecutadas</th>
                        <th style={styles.th}>Caudal Medio</th>
                        <th style={styles.th}>Lámina Acumulada (mm)</th>
                        <th style={styles.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay riegos registrados.
                          </td>
                        </tr>
                      ) : (
                        logList.reverse().map(log => (
                          <tr key={log.id} style={styles.tableRowBody}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{log.sector}</td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                log.type === 'Goteo' ? 'badge-cosecha' : log.type === 'Fertirriego' ? 'badge-procesamiento' : 'badge-siembra'
                              }`}>
                                {log.type}
                              </span>
                            </td>
                            <td style={styles.td}>{log.hours} hrs</td>
                            <td style={styles.td}>{log.caudal} L/min</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: 'var(--primary)' }}>
                              {log.mmAccumulated} mm
                            </td>
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

          {/* TAB 3: ESTACIÓN METEOROLÓGICA LIVE */}
          {activeTab === 'estacion' && liveWeather && (
            <div>
              <div style={styles.tabHeader}>
                <h3 style={styles.sectionTitle}>Lectura Estación Meteorológica (IoT)</h3>
                <button onClick={handleRefreshIoT} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Simular Lectura IoT
                </button>
              </div>

              <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                {/* Temp Card */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Temperatura en Aire</span>
                    <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
                      🔥
                    </div>
                  </div>
                  <div className="metric-value">{liveWeather.temperature}°C</div>
                  <div className="metric-footer">Sensor termopar de precisión</div>
                </div>

                {/* Humidity Card */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Humedad de Ambiente</span>
                    <div style={{ ...styles.iconBox, backgroundColor: 'var(--tertiary-container)' }}>
                      💧
                    </div>
                  </div>
                  <div className="metric-value">{liveWeather.humidity}%</div>
                  <div className="metric-footer">Sensor capacitivo higrométrico</div>
                </div>

                {/* Rain Card */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Precipitaciones</span>
                    <div style={{ ...styles.iconBox, backgroundColor: 'var(--primary-light)' }}>
                      🌧️
                    </div>
                  </div>
                  <div className="metric-value">{liveWeather.rain} mm</div>
                  <div className="metric-footer">Pluviómetro de balancín</div>
                </div>

                {/* Wind Card */}
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">Velocidad del Viento</span>
                    <div style={{ ...styles.iconBox, backgroundColor: 'var(--outline)' }}>
                      💨
                    </div>
                  </div>
                  <div className="metric-value">{liveWeather.wind} km/h</div>
                  <div className="metric-footer">Anemómetro ({liveWeather.windDirection})</div>
                </div>
              </div>

              <div className="card" style={{ padding: '20px', border: '1px solid var(--outline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ ...styles.cardTitle, margin: 0 }}>Estado del Enlace Satelital IoT</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Última transmisión: {new Date(liveWeather.lastUpdate).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.onlineDot}></span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tertiary)' }}>En línea (Transmitiendo cada 15m)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GRÁFICO TEMP VS HUMEDAD */}
          {activeTab === 'grafico' && (
            <div>
              <h3 style={styles.sectionTitle}>Comportamiento de Variables Críticas</h3>
              {renderLineChart()}
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
  formContainer: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  guideText: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  formulaBox: {
    backgroundColor: '#ffffff',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--outline)',
    marginBottom: '16px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  guideList: {
    fontSize: '13px',
    color: 'var(--tertiary-dark)',
    paddingLeft: '20px',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  chartText: {
    fontSize: '10px',
    fill: 'var(--text-muted)',
  },
  legendContainer: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    marginTop: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2e7d32',
    boxShadow: '0 0 8px #2e7d32',
  }
};
