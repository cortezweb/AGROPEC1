import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, update } from 'firebase/database';

const TABS = [
  { id: 'programacion', label: 'Programación de Riego' },
  { id: 'historial', label: 'Historial de Riego' },
  { id: 'consumo', label: 'Consumo de Agua' },
  { id: 'clima', label: 'Clima e IoT' }
];

const IRRIGATION_METHODS = ['Goteo', 'Aspersión'];
const STATUS_TYPES = ['Programado', 'Completado'];

export default function IrrigationSystem() {
  const [activeTab, setActiveTab] = useState('programacion');
  const [lots, setLots] = useState({});
  const [logs, setLogs] = useState({});
  const [controls, setControls] = useState({});
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherHistory, setWeatherHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for scheduler
  const [selectedLotId, setSelectedLotId] = useState('');
  const [irrigationDate, setIrrigationDate] = useState(new Date().toISOString().substring(0, 10));
  const [hours, setHours] = useState('2');
  const [caudal, setCaudal] = useState('15');
  const [method, setMethod] = useState('Goteo');
  const [status, setStatus] = useState('Programado');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setLogs(data.irrigation_logs || {});
        setControls(data.irrigation_controls || {});
        setLiveWeather(data.weather_live || null);
        setWeatherHistory(data.weather_history || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (IrrigationSystem):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prepopulate form lot selection once loaded
  useEffect(() => {
    const lotKeys = Object.keys(lots);
    if (lotKeys.length > 0 && !selectedLotId) {
      setSelectedLotId(lotKeys[0]);
    }
  }, [lots]);

  const lotList = Object.values(lots);
  const logList = Object.values(logs).sort((a, b) => new Date(b.date) - new Date(a.date));
  const controlList = Object.values(controls).sort((a, b) => new Date(a.date) - new Date(b.date));
  const historyList = Object.values(weatherHistory);

  // Active program list (only pending ones)
  const pendingPrograms = controlList.filter(c => c.status === 'Programado');

  const handleCreateProgram = (e) => {
    e.preventDefault();
    if (!selectedLotId || !hours || !caudal || !irrigationDate) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (Number(hours) <= 0 || Number(caudal) <= 0) {
      alert("Las horas y el caudal deben ser mayores que cero.");
      return;
    }

    setSubmitting(true);
    const hrsVal = parseFloat(hours);
    const caudalVal = parseFloat(caudal);
    const lotName = lots[selectedLotId]?.name || 'Lote Desconocido';

    // Calculate water consumed (Liters) = Caudal (L/min) * 60 * hours
    const waterConsumed = Math.round(caudalVal * 60 * hrsVal);
    // Calculate mmAccumulated = (Caudal * 60 * horas) / 100
    const mmAccumulated = parseFloat(((caudalVal * 60 * hrsVal) / 100).toFixed(1));

    const ctrlRef = ref(db, 'irrigation_controls');
    const newCtrlRef = push(ctrlRef);
    const id = newCtrlRef.key;

    const newRecord = {
      id,
      lotId: selectedLotId,
      sector: lotName,
      date: irrigationDate,
      type: method,
      hours: hrsVal,
      caudal: caudalVal,
      waterConsumed,
      mmAccumulated,
      status,
      createdAt: new Date().toISOString()
    };

    set(newCtrlRef, newRecord)
      .then(() => {
        // If status is immediately 'Completado', also push directly to logs/history
        if (status === 'Completado') {
          const logRef = ref(db, `irrigation_logs/${id}`);
          set(logRef, newRecord);
        }

        alert("¡Operación de riego guardada exitosamente!");
        setHours('2');
        setCaudal('15');
        setStatus('Programado');
        setSubmitting(false);
        setActiveTab('programacion');
      })
      .catch(err => {
        console.error("Firebase Write Error:", err);
        alert("Error al guardar la operación.");
        setSubmitting(false);
      });
  };

  const handleExecuteIrrigation = (ctrlId) => {
    if (!window.confirm("¿Desea ejecutar esta programación de riego ahora?")) return;

    const targetCtrl = controls[ctrlId];
    if (!targetCtrl) return;

    // Update status in controls
    const ctrlRef = ref(db, `irrigation_controls/${ctrlId}`);
    const updatedRecord = {
      ...targetCtrl,
      status: 'Completado',
      date: new Date().toISOString().substring(0, 10) // Updated to today
    };

    update(ctrlRef, { status: 'Completado', date: updatedRecord.date })
      .then(() => {
        // Push copy to irrigation_logs
        const logRef = ref(db, `irrigation_logs/${ctrlId}`);
        set(logRef, updatedRecord);
        alert("¡Riego ejecutado y registrado en el historial!");
      })
      .catch(err => {
        console.error(err);
        alert("Error al ejecutar el riego.");
      });
  };

  // Live IoT weather simulated update
  const handleRefreshIoT = () => {
    if (!liveWeather) return;
    
    const randomTemp = parseFloat((10 + Math.random() * 10).toFixed(1));
    const randomHum = Math.floor(30 + Math.random() * 50);
    const randomRain = parseFloat((Math.random() * 5).toFixed(1));
    const randomWind = parseFloat((5 + Math.random() * 20).toFixed(1));
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

  // Water Consumption Metrics
  const totalWaterConsumed = logList.reduce((sum, item) => sum + (Number(item.waterConsumed) || 0), 0);
  
  // Consumption by lot calculations
  const lotConsumption = logList.reduce((acc, item) => {
    acc[item.sector] = (acc[item.sector] || 0) + (Number(item.waterConsumed) || 0);
    return acc;
  }, {});

  const maxLotConsumption = Math.max(...Object.values(lotConsumption), 1);

  // Consumption by method
  const methodConsumption = logList.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + (Number(item.waterConsumed) || 0);
    return acc;
  }, { 'Goteo': 0, 'Aspersión': 0 });

  // Estimated water saved: Drip uses 20% less water for same yield on average
  // Drip is 90% efficient, Sprinkler is 70% efficient.
  // Saved amount = Sprinkler consumption * (1 - 0.7/0.9) approx
  const estimatedSaved = Math.round(methodConsumption['Goteo'] * 0.22);

  const renderLineChart = () => {
    if (historyList.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No hay datos históricos para trazar el gráfico. Refresque en Estación Meteorológica.
        </div>
      );
    }

    const chartData = historyList.slice(-8);
    const width = 600;
    const height = 240;
    const paddingLeft = 50;
    const paddingRight = 50;
    const paddingTop = 30;
    const paddingBottom = 40;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const temps = chartData.map(d => d.temp);
    const hums = chartData.map(d => d.hum);
    const maxTemp = Math.max(...temps, 25);
    const minTemp = Math.min(...temps, 0);
    const maxHum = Math.max(...hums, 100);
    const minHum = Math.min(...hums, 0);
    const tempRange = maxTemp - minTemp || 1;
    const humRange = maxHum - minHum || 1;

    const getX = (index) => paddingLeft + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
    const getTempY = (val) => height - paddingBottom - ((val - minTemp) / tempRange) * chartHeight;
    const getHumY = (val) => height - paddingBottom - ((val - minHum) / humRange) * chartHeight;

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
      <div style={styles.chartContainerCard}>
        <h4 style={styles.chartInsideTitle}>Tendencia de Sensor IoT (Últimas Lecturas)</h4>
        <div style={{ position: 'relative', width: '100%' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />
            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />
            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e4e2e1" strokeWidth="1.5" />

            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const yVal = paddingTop + r * chartHeight;
              return (
                <line key={i} x1={paddingLeft} y1={yVal} x2={width - paddingRight} y2={yVal} stroke="#f0eded" strokeDasharray="4 4" />
              );
            })}

            <text x={paddingLeft - 10} y={paddingTop + 4} textAnchor="end" style={styles.chartText}>
              {maxTemp.toFixed(0)}°C
            </text>
            <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 4} textAnchor="end" style={styles.chartText}>
              {((maxTemp + minTemp) / 2).toFixed(0)}°C
            </text>
            <text x={paddingLeft - 10} y={height - paddingBottom + 4} textAnchor="end" style={styles.chartText}>
              {minTemp.toFixed(0)}°C
            </text>

            <text x={width - paddingRight + 10} y={paddingTop + 4} textAnchor="start" style={styles.chartText}>
              {maxHum}%
            </text>
            <text x={width - paddingRight + 10} y={paddingTop + chartHeight / 2 + 4} textAnchor="start" style={styles.chartText}>
              {((maxHum + minHum) / 2).toFixed(0)}%
            </text>
            <text x={width - paddingRight + 10} y={height - paddingBottom + 4} textAnchor="start" style={styles.chartText}>
              {minHum}%
            </text>

            {chartData.length > 1 && (
              <>
                <path d={tempPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={humPath} fill="none" stroke="var(--tertiary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {chartData.map((d, idx) => {
              const x = getX(idx);
              const tempY = getTempY(d.temp);
              const humY = getHumY(d.hum);
              return (
                <g key={idx}>
                  <circle cx={x} cy={tempY} r="4" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={x} cy={humY} r="4" fill="var(--tertiary)" stroke="#ffffff" strokeWidth="1.5" />
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
            <span style={styles.legendLabel}>Temperatura (°C, Izquierda)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: 'var(--tertiary)' }}></span>
            <span style={styles.legendLabel}>Humedad Relativa (%, Derecha)</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando controles de riego...</p>
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
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Sistema de Riego</h1>
          <p style={styles.subtitle}>Control de riego, monitoreo de consumo hídrico y estación meteorológica</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
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
        {activeTab === 'programacion' && (
          <div style={styles.formSplitGrid}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Programar / Registrar Operación de Riego</h2>
              <form onSubmit={handleCreateProgram} style={styles.form}>
                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Lote / Sector *</label>
                    <select
                      value={selectedLotId}
                      onChange={(e) => setSelectedLotId(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {Object.entries(lots).map(([id, lot]) => (
                        <option key={id} value={id}>{lot.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Método de Riego *</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {IRRIGATION_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Fecha *</label>
                    <input
                      type="date"
                      value={irrigationDate}
                      onChange={(e) => setIrrigationDate(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Estado Inicial *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={styles.select}
                      required
                    >
                      {STATUS_TYPES.map(s => (
                        <option key={s} value={s}>{s === 'Programado' ? 'Programado (Válvula diferida)' : 'Completado (Ejecutado)'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Duración (Horas) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={styles.label}>Caudal Medio (L/min) *</label>
                    <input
                      type="number"
                      min="1"
                      value={caudal}
                      onChange={(e) => setCaudal(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? 'Guardando...' : status === 'Programado' ? 'Programar Válvula de Riego' : 'Registrar Riego Completado'}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={styles.sectionTitle}>Cola de Riegos Programados</h2>
              <p style={styles.guideText}>Válvulas IoT pendientes de apertura automática o disparo manual</p>

              {pendingPrograms.length === 0 ? (
                <div style={{ ...styles.emptyState, padding: '40px 0' }}>
                  <p style={{ margin: 0, fontSize: '13px' }}>No hay riegos programados pendientes.</p>
                </div>
              ) : (
                <div style={styles.pendingList}>
                  {pendingPrograms.map(prog => (
                    <div key={prog.id} style={styles.pendingItem}>
                      <div>
                        <span style={styles.pendingLot}>{prog.sector}</span>
                        <div style={styles.pendingSub}>
                          <span>Método: {prog.type}</span> | <span>Fecha: {prog.date}</span>
                        </div>
                        <div style={styles.pendingSub}>
                          <span>Caudal: {prog.caudal} L/min</span> | <span>Duración: {prog.hours} hrs</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExecuteIrrigation(prog.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                      >
                        Abrir Válvula
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div>
            <h2 style={styles.sectionTitle}>Historial de Riegos Ejecutados</h2>
            {logList.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No se han registrado riegos históricos.</p>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableRowHead}>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Lote / Sector</th>
                      <th style={styles.th}>Método</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Horas</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Caudal</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Agua Consumida</th>
                      <th style={styles.th} style={{ textAlign: 'right' }}>Lámina (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logList.map(log => (
                      <tr key={log.id} style={styles.tableRowBody}>
                        <td style={styles.td}>{log.date}</td>
                        <td style={styles.td} style={{ fontWeight: 600 }}>{log.sector}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(log.type === 'Goteo' ? styles.badgeGoteo : styles.badgeAspersion)
                          }}>
                            {log.type}
                          </span>
                        </td>
                        <td style={styles.td} style={{ textAlign: 'right' }}>{log.hours} hrs</td>
                        <td style={styles.td} style={{ textAlign: 'right' }}>{log.caudal} L/min</td>
                        <td style={styles.td} style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(log.waterConsumed || 0).toLocaleString()} L
                        </td>
                        <td style={styles.td} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                          {log.mmAccumulated || 0} mm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'consumo' && (
          <div style={styles.metricsContainer}>
            {/* KPI Grid */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Consumo Hídrico Acumulado</span>
                <span style={styles.kpiValue}>{totalWaterConsumed.toLocaleString()} L</span>
                <span style={styles.kpiDesc}>Volumen total de agua captada</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Distribución Goteo</span>
                <span style={styles.kpiValue}>{(methodConsumption['Goteo'] || 0).toLocaleString()} L</span>
                <span style={styles.kpiDesc}>Eficiencia de aplicación del 90%</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Distribución Aspersión</span>
                <span style={styles.kpiValue}>{(methodConsumption['Aspersión'] || 0).toLocaleString()} L</span>
                <span style={styles.kpiDesc}>Eficiencia de aplicación del 70%</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Ahorro Hídrico Estimado</span>
                <span style={{ ...styles.kpiValue, color: 'var(--tertiary)' }}>{estimatedSaved.toLocaleString()} L</span>
                <span style={styles.kpiDesc}>Agua conservada por uso de Goteo</span>
              </div>
            </div>

            <div style={styles.row}>
              {/* Consumption by lot chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Volumen de Riego por Sector</h3>
                <p style={styles.chartSubtitle}>Consumo de agua acumulado por lote (Litros)</p>

                <div style={styles.chartWrapper}>
                  {Object.keys(lotConsumption).length === 0 ? (
                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Sin datos para mostrar.
                    </p>
                  ) : (
                    Object.entries(lotConsumption).map(([sectorName, consumption]) => {
                      const percentage = (consumption / maxLotConsumption) * 100;
                      return (
                        <div key={sectorName} style={styles.chartRow}>
                          <span style={{ ...styles.chartRowLabel, width: '130px' }}>{sectorName}</span>
                          <div style={styles.chartBarBg}>
                            <div
                              style={{
                                ...styles.chartBarFill,
                                width: `${percentage}%`,
                                backgroundColor: 'var(--primary)'
                              }}
                            ></div>
                          </div>
                          <span style={styles.chartRowValue}>{consumption.toLocaleString()} L</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clima' && liveWeather && (
          <div>
            <div style={styles.tabHeader}>
              <h3 style={styles.sectionTitle}>Lecturas en Vivo de Sensores IoT</h3>
              <button onClick={handleRefreshIoT} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Simular Lectura IoT
              </button>
            </div>

            <div style={styles.weatherGrid}>
              <div style={styles.weatherCard}>
                <div style={styles.weatherCardHeader}>
                  <span>Temperatura Aire</span>
                  <span>🔥</span>
                </div>
                <div style={styles.weatherCardVal}>{liveWeather.temperature}°C</div>
                <div style={styles.weatherCardFooter}>Sensor de precisión termométrica</div>
              </div>

              <div style={styles.weatherCard}>
                <div style={styles.weatherCardHeader}>
                  <span>Humedad Ambiente</span>
                  <span>💧</span>
                </div>
                <div style={styles.weatherCardVal}>{liveWeather.humidity}%</div>
                <div style={styles.weatherCardFooter}>Higrómetro capacitivo</div>
              </div>

              <div style={styles.weatherCard}>
                <div style={styles.weatherCardHeader}>
                  <span>Lluvia Reciente</span>
                  <span>🌧️</span>
                </div>
                <div style={styles.weatherCardVal}>{liveWeather.rain} mm</div>
                <div style={styles.weatherCardFooter}>Pluviómetro digital</div>
              </div>

              <div style={styles.weatherCard}>
                <div style={styles.weatherCardHeader}>
                  <span>Velocidad Viento</span>
                  <span>💨</span>
                </div>
                <div style={styles.weatherCardVal}>{liveWeather.wind} km/h</div>
                <div style={styles.weatherCardFooter}>Anemómetro ({liveWeather.windDirection})</div>
              </div>
            </div>

            {/* Line chart trend */}
            <div style={{ marginTop: '24px' }}>
              {renderLineChart()}
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
  sectionTitle: {
    fontSize: '18px',
    margin: 0,
    fontFamily: 'var(--font-headline)',
    color: 'var(--primary)',
    marginBottom: '16px',
  },
  guideText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '4px 0 16px 0',
  },
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pendingItem: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  pendingLot: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  pendingSub: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px dashed var(--outline)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-muted)',
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
  badgeGoteo: {
    backgroundColor: '#e6f7ff',
    color: '#0050b3',
  },
  badgeAspersion: {
    backgroundColor: '#f6ffed',
    color: '#389e0d',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
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
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  weatherCard: {
    backgroundColor: 'var(--bg-primary)',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--outline)',
  },
  weatherCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  weatherCardVal: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--primary)',
    margin: '12px 0 4px 0',
  },
  weatherCardFooter: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  chartContainerCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--outline)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
  },
  chartInsideTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--primary)',
    marginBottom: '20px',
    margin: 0,
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
    flexWrap: 'wrap',
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
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  }
};
