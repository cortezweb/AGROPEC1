import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push } from 'firebase/database';

const CATALOG = [
  { id: 'prod-1', name: 'Cañihua en Grano Orgánico', type: 'Grano', price: 4.50, unit: 'kg' },
  { id: 'prod-2', name: 'Harina Integral de Cañihua', type: 'Harina', price: 5.80, unit: 'kg' },
  { id: 'prod-3', name: 'Cañihua Pop (Extruido)', type: 'Cereal', price: 6.50, unit: 'kg' }
];

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

export default function Sales() {
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [client, setClient] = useState('');
  const [productId, setProductId] = useState('prod-1');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOrders(data);
      } else {
        // Initialize DB with Mock Data if empty
        set(ordersRef, MOCK_ORDERS);
        setOrders(MOCK_ORDERS);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase Read Error (Sales):", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!client || !quantity) {
      alert('Por favor complete todos los campos.');
      return;
    }

    const selectedProduct = CATALOG.find(p => p.id === productId);
    const qty = parseFloat(quantity);
    const totalPrice = selectedProduct.price * qty;

    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    const id = newOrderRef.key;

    set(newOrderRef, {
      id,
      client,
      productName: selectedProduct.name,
      quantity: qty,
      totalPrice,
      status: 'Preparando',
      date: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsModalOpen(false);
      setClient('');
      setQuantity('');
    }).catch(err => {
      console.error("Error saving order:", err);
      alert("Error al registrar el pedido en Firebase.");
    });
  };

  const getOrderStatusClass = (status) => {
    switch (status) {
      case 'Preparando': return 'badge-siembra';
      case 'En tránsito': return 'badge-crecimiento';
      case 'Entregado': return 'badge-cosecha';
      default: return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Portal de Ventas y Distribución</h1>
          <p style={styles.subtitle}>Gestión de pedidos B2B y logística de despacho de Cañihua</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar Venta B2B
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <h3 style={{ margin: 0, color: '#93000a' }}>⚠️ Error de Conexión a Firebase</h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Catalog Grid */}
      <h3 style={styles.sectionTitle}>Catálogo de Productos</h3>
      <div style={styles.catalogGrid}>
        {CATALOG.map(prod => (
          <div key={prod.id} className="card" style={styles.catalogCard}>
            <div style={styles.catalogHeader}>
              <span style={styles.catalogType}>{prod.type}</span>
              <span style={styles.catalogPrice}>${prod.price.toFixed(2)} / {prod.unit}</span>
            </div>
            <h4 style={styles.catalogName}>{prod.name}</h4>
            <p style={styles.catalogDesc}>Grano andino premium procesado bajo los más altos estándares de calidad orgánica de la Granja Canaviri.</p>
          </div>
        ))}
      </div>

      {/* B2B Orders Section */}
      <h3 style={styles.sectionTitle}>Registro de Pedidos y Logística</h3>
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <span>Cargando registro de ventas...</span>
        </div>
      ) : (
        <div className="card">
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableRowHead}>
                  <th style={styles.th}>ID Pedido</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Cantidad</th>
                  <th style={styles.th}>Precio Total</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Estado Despacho</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(orders).reverse().map(order => (
                  <tr key={order.id} style={styles.tableRowBody}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{order.id?.substring(0, 6).toUpperCase()}</td>
                    <td style={styles.td}>{order.client}</td>
                    <td style={styles.td}>{order.productName}</td>
                    <td style={styles.td}>{order.quantity} kg</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>${order.totalPrice?.toFixed(2)}</td>
                    <td style={styles.td}>{order.date}</td>
                    <td style={styles.td}>
                      <span className={`badge ${getOrderStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Sale Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Pedido B2B</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label" htmlFor="client">Nombre del Cliente (B2B)</label>
                <input
                  className="form-input"
                  type="text"
                  id="client"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Ej. Distribuidora Andina S.A."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="product">Producto Seleccionado</label>
                <select
                  className="form-input"
                  id="product"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  {CATALOG.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)}/kg)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="quantity">Cantidad (kg)</label>
                <input
                  className="form-input"
                  type="number"
                  id="quantity"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ej. 250"
                />
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-tertiary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Venta
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: '18px',
    fontFamily: 'var(--font-headline)',
    marginBottom: '16px',
    marginTop: '32px',
  },
  catalogGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  catalogCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  catalogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogType: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  catalogPrice: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  catalogName: {
    fontSize: '16px',
    fontFamily: 'var(--font-headline)',
    margin: 0,
  },
  catalogDesc: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
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
