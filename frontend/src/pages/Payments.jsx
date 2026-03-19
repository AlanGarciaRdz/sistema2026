import React, { useState, useEffect, useMemo } from 'react';
import { getPayments, deletePayment, createPayment, updatePayment, getQuotes, getContracts, getPaymentAccounts } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import jsPDF from 'jspdf';
import { FileDown } from 'lucide-react';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [sourceSearch, setSourceSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [formData, setFormData] = useState({
    sourceType: 'quote', // 'quote' or 'contract'
    sourceId: '',
    paymentType: 'Parcial',
    amount: '',
    paymentMethod: 'Efectivo',
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    invoiceNumber: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchQuotes();
    fetchContracts();
    fetchAccounts();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await getQuotes();
      setQuotes(response.data.data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getPaymentAccounts();
      setAccounts(response.data.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar pagos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (payment) => {
    if (window.confirm('¿Está seguro de eliminar este pago?')) {
      try {
        await deletePayment(payment.id);
        setToast({ message: 'Pago eliminado exitosamente', type: 'success' });
        fetchPayments();
      } catch (error) {
        setToast({ message: 'Error al eliminar pago', type: 'error' });
      }
    }
  };

  const handleOpenModal = () => {
    setEditingPayment(null);
    setSourceSearch('');
    setFormData({
      sourceType: 'quote',
      sourceId: '',
      paymentType: 'Parcial',
      amount: '',
      paymentMethod: 'Efectivo',
      accountId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceNumber: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (payment) => {
    // Parse notes to get quote_id if exists
    let sourceType = 'contract';
    let sourceId = payment.contract_id || '';
    
    try {
      const notesData = JSON.parse(payment.notes || '{}');
      if (notesData.quote_id) {
        sourceType = 'quote';
        sourceId = notesData.quote_id;
      }
    } catch {}
    
    setEditingPayment(payment);
    setFormData({
      sourceType: sourceType,
      sourceId: String(sourceId),
      paymentType: payment.payment_type || 'Parcial',
      amount: payment.amount || '',
      paymentMethod: payment.payment_method || 'Efectivo',
      accountId: payment.payment_account_id || '',
      paymentDate: payment.payment_date ? payment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
      invoiceNumber: payment.invoice_number || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Store quote_id in notes as JSON if it's a quote payment
      const additionalNotes = formData.sourceType === 'quote' 
        ? JSON.stringify({ quote_id: formData.sourceId })
        : null;

      const paymentData = {
        contract_id: formData.sourceType === 'contract' ? formData.sourceId : null,
        contract_number: null, // Can be filled if needed
        payment_type: formData.paymentType,
        amount: parseFloat(formData.amount),
        payment_method: formData.paymentMethod,
        payment_account_id: formData.accountId || null,
        payment_date: formData.paymentDate,
        invoice_number: formData.invoiceNumber || null,
        iva_amount: null,
        notes: additionalNotes
      };

      let savedPayment;
      if (editingPayment) {
        // Update existing payment
        const response = await updatePayment(editingPayment.id, paymentData);
        savedPayment = response.data.data;
        setToast({ message: 'Pago actualizado exitosamente', type: 'success' });
      } else {
        // Create new payment
        const response = await createPayment(paymentData);
        savedPayment = response.data.data;
        setToast({ message: 'Pago registrado exitosamente', type: 'success' });
      }
      
      setIsModalOpen(false);
      setEditingPayment(null);
      fetchPayments();
      
      // Generate receipt automatically
      await generateReceipt(savedPayment);
    } catch (error) {
      console.error('Error saving payment:', error);
      setToast({ message: 'Error al guardar pago', type: 'error' });
    }
  };

  const generateReceipt = async (payment) => {
    try {
      // Get source data (quote or contract)
      let serviceData = null;
      let sourceId = null;
      
      // Try to get quote_id from notes first
      try {
        const notesData = JSON.parse(payment.notes || '{}');
        if (notesData.quote_id) {
          sourceId = notesData.quote_id;
          formData.sourceType = 'quote';
        }
      } catch {}
      
      // If no quote_id in notes, use contract_id
      if (!sourceId && payment.contract_id) {
        sourceId = payment.contract_id;
        formData.sourceType = 'contract';
      }

      if (formData.sourceType === 'quote' && sourceId) {
        const quote = quotes.find(q => q.id === parseInt(sourceId));
        if (quote) {
          serviceData = {
            type: 'Cotización',
            number: quote.id || '',
            client: quote.client_name || 'N/A',
            origin: quote.origin || '',
            destination: quote.destination || '',
            startDate: quote.start_date || '',
            endDate: quote.end_date || '',
            totalAmount: quote.total_amount || 0
          };
        }
      } else if (formData.sourceType === 'contract' && sourceId) {
        const contract = contracts.find(c => c.id === parseInt(sourceId));
        if (contract) {
          serviceData = {
            type: 'Contrato',
            number: contract.contract_number || '',
            client: contract.client_name || 'N/A',
            startDate: contract.start_date || '',
            endDate: contract.end_date || '',
            totalAmount: contract.total_amount || 0
          };
        }
      }

      // Fallback if no service data found
      if (!serviceData) {
        serviceData = {
          type: 'Servicio',
          number: 'N/A',
          client: 'N/A',
          startDate: '',
          endDate: '',
          totalAmount: payment.amount
        };
      }

      const account = accounts.find(a => a.id === parseInt(formData.accountId));

      // Create PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('RECIBO DE PAGO', 105, 20, { align: 'center' });
      
      // Company info (you can customize this)
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Recorriendo Kilómetros', 105, 30, { align: 'center' });
      doc.text('Transporte Turístico', 105, 35, { align: 'center' });
      
      // Receipt number and date
      doc.setFontSize(12);
      doc.text(`Folio: ${payment.id || 'N/A'}`, 20, 50);
      doc.text(`Fecha: ${formatDate(formData.paymentDate)}`, 20, 57);
      
      // Line separator
      doc.line(20, 65, 190, 65);
      
      // Service Information
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMACIÓN DEL SERVICIO', 20, 75);
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      let yPos = 85;
      doc.text(`Tipo: ${serviceData.type}`, 20, yPos);
      doc.text(`Número: ${serviceData.number}`, 20, yPos + 7);
      doc.text(`Cliente: ${serviceData.client}`, 20, yPos + 14);
      
      if (serviceData.origin && serviceData.destination) {
        doc.text(`Ruta: ${serviceData.origin} → ${serviceData.destination}`, 20, yPos + 21);
        yPos += 7;
      }
      
      doc.text(`Fecha Servicio: ${formatDate(serviceData.startDate)} - ${formatDate(serviceData.endDate)}`, 20, yPos + 21);
      doc.text(`Monto Total Servicio: ${formatCurrency(serviceData.totalAmount)}`, 20, yPos + 28);
      
      // Line separator
      yPos += 40;
      doc.line(20, yPos, 190, yPos);
      
      // Payment Information
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMACIÓN DEL PAGO', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Tipo de Pago: ${formData.paymentType}`, 20, yPos);
      doc.text(`Método de Pago: ${formData.paymentMethod}`, 20, yPos + 7);
      doc.text(`Cuenta: ${account?.account_name || 'N/A'}`, 20, yPos + 14);
      if (formData.invoiceNumber) {
        doc.text(`Factura: ${formData.invoiceNumber}`, 20, yPos + 21);
        yPos += 7;
      }
      
      // Amount box
      yPos += 30;
      doc.setDrawColor(0);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 20, 'F');
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`MONTO PAGADO: ${formatCurrency(parseFloat(formData.amount))}`, 105, yPos + 13, { align: 'center' });
      
      // Footer
      yPos += 35;
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Gracias por su pago', 105, yPos, { align: 'center' });
      doc.text(`Recibo generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, yPos + 7, { align: 'center' });
      
      // Save PDF
      doc.save(`Recibo_${payment.id}_${formData.paymentDate}.pdf`);
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      setToast({ message: 'Pago guardado pero error al generar recibo', type: 'warning' });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const filteredPayments = useMemo(() => {
    if (!tableSearch.trim()) return payments;
    const q = tableSearch.toLowerCase().trim();
    return payments.filter((p) => {
      try {
        const notesData = JSON.parse(p.notes || '{}');
        if (notesData.quote_id) {
          const quote = quotes.find(qu => qu.id === parseInt(notesData.quote_id));
          if (quote) {
            return (
              String(notesData.quote_id).includes(q) ||
              (quote.client_name || '').toLowerCase().includes(q) ||
              (quote.quote_number || '').toLowerCase().includes(q)
            );
          }
        }
      } catch {}
      const contract = contracts.find(c => c.id === p.contract_id);
      const contractNum = p.contract_number || contract?.contract_number || '';
      const clientName = contract?.client_name || p.client_name || '';
      return (
        contractNum.toLowerCase().includes(q) ||
        contractNum.includes(q) ||
        clientName.toLowerCase().includes(q)
      );
    });
  }, [payments, tableSearch, quotes, contracts]);

  const columns = [
    { 
      header: 'Contrato', 
      render: (row) => {
        try {
          const notesData = JSON.parse(row.notes || '{}');
          if (notesData.quote_id) {
            const quote = quotes.find(q => q.id === parseInt(notesData.quote_id));
            const label = `Cotización #${notesData.quote_id}`;
            const client = quote?.client_name || '-';
            const date = quote?.start_date ? formatDate(quote.start_date) : '-';
            return (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-gray-500">{client}</span>
                <span className="text-xs text-gray-500">{date}</span>
              </div>
            );
          }
        } catch {}
        const contract = contracts.find(c => c.id === row.contract_id);
        const label = row.contract_number ? `Contrato ${row.contract_number}` : (contract?.contract_number ? `Contrato ${contract.contract_number}` : 'N/A');
        const client = contract?.client_name || row.client_name || '-';
        const date = (contract?.start_date || row.start_date) ? formatDate(contract?.start_date || row.start_date) : '-';
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{label}</span>
            <span className="text-xs text-gray-500">{client}</span>
            <span className="text-xs text-gray-500">{date}</span>
          </div>
        );
      }
    },
    { header: 'Tipo', accessor: 'payment_type' },
    { header: 'Monto', render: (row) => formatCurrency(row.amount) },
    { header: 'Método', accessor: 'payment_method' },
    { header: 'Cuenta', accessor: 'account_name' },
    { header: 'Fecha', render: (row) => formatDate(row.payment_date) },
    { header: 'Factura', accessor: 'invoice_number' }
  ];

  const getSourceOptions = () => {
    const search = (sourceSearch || '').toLowerCase().trim();
    const filterBySearch = (item, label) =>
      !search || label.toLowerCase().includes(search) || String(item.value).includes(search);

    if (formData.sourceType === 'quote') {
      return quotes
        .map(quote => ({
          value: quote.id,
          label: `#${quote.id} - ${quote.client_name || 'Sin cliente'} (${formatCurrency(quote.total_amount)})`
        }))
        .filter(opt => filterBySearch(opt, opt.label));
    } else {
      return contracts
        .map(contract => ({
          value: contract.id,
          label: `${contract.contract_number || ''} - ${contract.client_name || 'Sin cliente'} (${formatCurrency(contract.total_amount)})`
        }))
        .filter(opt => filterBySearch(opt, opt.label));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header 
        title="Ingresos" 
        buttonText="+ Registrar Ingreso"
        onButtonClick={handleOpenModal}
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por número de contrato o nombre del cliente..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {tableSearch && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando {filteredPayments.length} de {payments.length} pagos
          </p>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredPayments}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? "Editar Pago" : "Registrar Nuevo Pago"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origen del Pago
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="quote"
                  checked={formData.sourceType === 'quote'}
                  onChange={(e) => {
                    setSourceSearch('');
                    setFormData({ ...formData, sourceType: e.target.value, sourceId: '' });
                  }}
                  className="mr-2"
                />
                Cotización
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="contract"
                  checked={formData.sourceType === 'contract'}
                  onChange={(e) => {
                    setSourceSearch('');
                    setFormData({ ...formData, sourceType: e.target.value, sourceId: '' });
                  }}
                  className="mr-2"
                />
                Contrato
              </label>
            </div>
          </div>

          {/* Search / Lookup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar {formData.sourceType === 'quote' ? 'cotización' : 'contrato'}
            </label>
            <input
              type="text"
              placeholder={formData.sourceType === 'quote'
                ? 'Escribe #, número o nombre del cliente...'
                : 'Escribe número de contrato o nombre del cliente...'}
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Source Selection */}
          <div>
            <FormSelect
              label={formData.sourceType === 'quote' ? 'Seleccionar Cotización' : 'Seleccionar Contrato'}
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              options={getSourceOptions()}
              required
            />
            {sourceSearch && getSourceOptions().length === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                No se encontraron {formData.sourceType === 'quote' ? 'cotizaciones' : 'contratos'}. Intenta con otro término.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Type */}
            <FormSelect
              label="Tipo de Pago"
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              options={[
                { value: 'Parcial', label: 'Parcial' },
                { value: 'Total', label: 'Total' },
                { value: 'Anticipo', label: 'Anticipo' },
                { value: 'Liquidación', label: 'Liquidación' }
              ]}
              required
            />

            {/* Amount */}
            <FormInput
              label="Monto"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Method */}
            <FormSelect
              label="Método de Pago"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              options={[
                { value: 'Efectivo', label: 'Efectivo' },
                { value: 'Transferencia', label: 'Transferencia' },
                { value: 'Tarjeta', label: 'Tarjeta' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Depósito', label: 'Depósito' }
              ]}
              required
            />

            {/* Account */}
            <FormSelect
              label="Cuenta"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              options={accounts.map(account => ({
                value: account.id,
                label: `${account.account_name} (${account.bank_name})`
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Date */}
            <FormInput
              label="Fecha de Pago"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
            />

            {/* Invoice Number */}
            <FormInput
              label="Número de Factura (Opcional)"
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="Ej: FAC-001"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FileDown size={20} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Generación Automática de Recibo</p>
                <p>Al guardar el pago, se generará y descargará automáticamente un recibo en PDF con toda la información del servicio y el pago.</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="success">
              {editingPayment ? '💾 Actualizar y Generar Recibo' : '💾 Guardar y Generar Recibo'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Payments;
