import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function FinanceRentability() {
  const [lots, setLots] = useState({});
  const [preparations, setPreparations] = useState({});
  const [fertilizations, setFertilizates] = useState({});
  const [staffLogs, setStaffLogs] = useState({});
  const [invoices, setInvoices] = useState({});
  const [salesOrders, setSalesOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLots(data.lots || {});
        setPreparations(data.land_preparation || {});
        setFertilizates(data.crop_fertilizations || {});
        setStaffLogs(data.staff_logs || {});
        setInvoices(data.warehouse_invoices || data.machine_invoices || {});
        setSalesOrders(data.orders || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (FinanceRentability):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Lists
  const lotList = Object.values(lots);
  const prepList = Object.values(preparations);
  const fertList = Object.values(fertilizations);
  const slogList = Object.values(staffLogs);
  const invList = Object.values(invoices);
  const salesList = Object.values(salesOrders);

  // Totals calculations
  const costPreparation = prepList.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const costFertilization = fertList.reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
  const costLabor = slogList.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);
  const costIndirect = invList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalCosts = costPreparation + costFertilization + costLabor + costIndirect;
  const totalRevenues = salesList
    .filter(o => o.status === 'Entregado' || o.status === 'En tránsito')
    .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

  const netUtility = totalRevenues - totalCosts;
  const marginPercentage = totalRevenues > 0 ? (netUtility / totalRevenues) * 100 : 0;

  const totalArea = lotList.reduce((sum, l) => sum + (Number(l.area) || 0), 0);
  const costPerHa = totalArea > 0 ? (totalCosts / totalArea) : 0;

  // Lot breakdown calculations
  const lotFinances = lotList.map(lot => {
    const lPreps = prepList.filter(p => p.lotId === lot.id);
    const lFerts = fertList.filter(f => f.lotId === lot.id);
    const lLabor = slogList.filter(l => l.lotId === lot.id);

    const prepCost = lPreps.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const fertCost = lFerts.reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
    const laborCost = lLabor.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);

    const directCost = prepCost + fertCost + laborCost;

    // Estimate revenues proportional to lot production area (simulated allocation)
    const lotRevenues = totalArea > 0 ? (totalRevenues * (lot.area / totalArea)) : 0;
    const lotNetUtility = lotRevenues - directCost;

    return {
      id: lot.id,
      name: lot.name,
      area: lot.area,
      directCost,
      estimatedRevenues: lotRevenues,
      netUtility: lotNetUtility,
      utilityPerHa: lot.area > 0 ? (lotNetUtility / lot.area) : 0
    };
  });

  const maxFinanceVal = Math.max(totalRevenues, totalCosts, 1);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando balance financiero...</p>
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
          <h1 style={styles.title} className="view-title">Costos y Rentabilidad</h1>
          <p style={styles.subtitle} className="view-subtitle">Análisis financiero integrado: gastos directos, indirectos, ROI y utilidades por lote</p>
        </div>
      </header>

      {/* KPI Panel */}
      <div style={styles.kpiGrid} className="view-kpi-grid">
        <div style={styles.kpiCard} className="view-kpi-card">
          <span style={styles.kpiLabel}>Ingresos Operativos</span>
          <span style={{ ...styles.kpiValue, color: 'var(--tertiary)' }}>
            ${totalRevenues.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={styles.kpiDesc}>Facturación por ventas de grano</span>
        </div>

        <div style={styles.kpiCard} className="view-kpi-card">
          <span style={styles.kpiLabel}>Costos Totales (Egresos)</span>
          <span style={{ ...styles.kpiValue, color: 'var(--error)' }}>
            ${totalCosts.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={styles.kpiDesc}>Directos (${(costPreparation+costFertilization+costLabor).toFixed(0)}) + Indirectos (${costIndirect.toFixed(0)})</span>
        </div>

        <div style={styles.kpiCard} className="view-kpi-card">
          <span style={styles.kpiLabel}>Utilidad Neta (Margen)</span>
          <span style={{ ...styles.kpiValue, color: netUtility >= 0 ? 'var(--tertiary)' : 'var(--error)' }}>
            ${netUtility.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({marginPercentage.toFixed(1)}%)
          </span>
          <span style={styles.kpiDesc}>Balance general contable</span>
        </div>

        <div style={styles.kpiCard} className="view-kpi-card">
          <span style={styles.kpiLabel}>Costo Medio por Hectárea</span>
          <span style={styles.kpiValue}>
            ${costPerHa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /ha
          </span>
          <span style={styles.kpiDesc}>Eficiencia de inversión por superficie</span>
        </div>
      </div>

      <div style={styles.row} className="view-form-row">
        {/* Cost Breakdown */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Distribución de Costos Directos e Indirectos</h3>
          <p style={styles.chartSubtitle}>Desglose analítico de egresos operativos</p>

          <div style={styles.chartWrapper}>
            <div style={styles.chartRow}>
              <span style={{ ...styles.chartRowLabel, width: '130px' }}>Prep. Terreno</span>
              <div style={styles.chartBarBg}>
                <div style={{ ...styles.chartBarFill, width: `${(costPreparation / Math.max(totalCosts, 1)) * 100}%`, backgroundColor: '#8b4513' }}></div>
              </div>
              <span style={styles.chartRowValue}>${costPreparation.toFixed(2)}</span>
            </div>

            <div style={styles.chartRow}>
              <span style={{ ...styles.chartRowLabel, width: '130px' }}>Fertilización</span>
              <div style={styles.chartBarBg}>
                <div style={{ ...styles.chartBarFill, width: `${(costFertilization / Math.max(totalCosts, 1)) * 100}%`, backgroundColor: '#d46b08' }}></div>
              </div>
              <span style={styles.chartRowValue}>${costFertilization.toFixed(2)}</span>
            </div>

            <div style={styles.chartRow}>
              <span style={{ ...styles.chartRowLabel, width: '130px' }}>Mano de Obra</span>
              <div style={styles.chartBarBg}>
                <div style={{ ...styles.chartBarFill, width: `${(costLabor / Math.max(totalCosts, 1)) * 100}%`, backgroundColor: '#324536' }}></div>
              </div>
              <span style={styles.chartRowValue}>${costLabor.toFixed(2)}</span>
            </div>

            <div style={styles.chartRow}>
              <span style={{ ...styles.chartRowLabel, width: '130px' }}>Gastos Indirectos</span>
              <div style={styles.chartBarBg}>
                <div style={{ ...styles.chartBarFill, width: `${(costIndirect / Math.max(totalCosts, 1)) * 100}%`, backgroundColor: 'var(--text-muted)' }}></div>
              </div>
              <span style={styles.chartRowValue}>${costIndirect.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Balance SVG Graphic */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Balance Financiero General</h3>
          <p style={styles.chartSubtitle}>Comparación de ingresos vs egresos acumulados</p>

          <div style={styles.balanceVisual}>
            <div style={styles.balanceColumn}>
              <span style={styles.balanceTitle}>Ingresos</span>
              <div style={{ ...styles.balanceBar, height: `${(totalRevenues / maxFinanceVal) * 140}px`, backgroundColor: '#389e0d' }}></div>
              <span style={styles.balanceValText}>${totalRevenues.toLocaleString()}</span>
            </div>
            <div style={styles.balanceColumn}>
              <span style={styles.balanceTitle}>Egresos</span>
              <div style={{ ...styles.balanceBar, height: `${(totalCosts / maxFinanceVal) * 140}px`, backgroundColor: '#cf1322' }}></div>
              <span style={styles.balanceValText}>${totalCosts.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lot Rentability Table */}
      <div style={{ ...styles.card, marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>Rentabilidad Desglosada por Lotes</h3>
        <div style={styles.tableContainer} className="view-table-container">
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableRowHead}>
                <th style={styles.th}>Lote / Sector</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Superficie (ha)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Costos Directos</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Ingresos Estimados</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Utilidad Neta</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Utilidad / Ha</th>
              </tr>
            </thead>
            <tbody>
              {lotFinances.map(lf => (
                <tr key={lf.id} style={styles.tableRowBody}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{lf.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{lf.area.toFixed(1)} ha</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: 'var(--error)' }}>
                    -${lf.directCost.toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: 'var(--tertiary)' }}>
                    +${lf.estimatedRevenues.toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: lf.netUtility >= 0 ? 'var(--tertiary)' : 'var(--error)' }}>
                    ${lf.netUtility.toFixed(2)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                    ${lf.utilityPerHa.toFixed(2)} /ha
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--outline)',
    minWidth: '300px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--outline)',
    boxShadow: 'var(--shadow-sm)',
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
    fontSize: '22px',
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
  row: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap',
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
    width: '90px',
    textAlign: 'right',
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--primary)',
  },
  balanceVisual: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '180px',
    paddingTop: '20px',
  },
  balanceColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  balanceBar: {
    width: '50px',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.8s ease-out',
  },
  balanceTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  balanceValText: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
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
