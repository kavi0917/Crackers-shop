/* ============================================================
   VENDHAN CRACKERS — Customer Invoice PDF Service
   ============================================================

   Generates a clean, professional invoice PDF for an authenticated
   customer's own order.

   IMPORTANT — this service NEVER recalculates pricing. Every value
   printed is read directly from the STORED order document (items,
   pricing.subtotal, pricing.discount, pricing.deliveryCharge,
   pricing.total, pricing.gst). GST is stored as 0 (prices are
   inclusive of all taxes), so the invoice shows the standing
   "Inclusive of all taxes" note instead of a computed GST line.

   Uses the project's existing pdfmake dependency (same setup as
   backend/services/adminReportService.js sales-report export).
   ============================================================ */

const settingsService = require('./settingsService');

/* ---------- Formatting Helpers ---------- */

function formatNumber(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatINR(amount) {
  return `₹${formatNumber(amount)}`;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

function textList(items) {
  return items.filter((v) => v && String(v).trim()).join('\n');
}
/**
 * Build an invoice document definition (pdfmake) strictly from STORED order
 * values. Exported separately from generateInvoicePdf so tests can assert the
 * exact totals rendered on the PDF against the stored order document.
 *
 * @param {object} order    - A stored Order mongoose document (or plain object).
 * @param {object} settings - Result of settingsService.getSettings().
 * @returns {object} pdfmake document definition.
 */
function buildInvoiceDocDefinition(order, settings) {
  const pricing = order.pricing || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const customer = order.customer || {};
  const address = order.deliveryAddress || {};
  const payment = order.payment || {};

  const subtotal = Number(pricing.subtotal) || 0;
  const discount = Number(pricing.discount) || 0;
  const deliveryCharge = Number(pricing.deliveryCharge) || 0;
  const gst = Number(pricing.gst) || 0;
  const total = Number(pricing.total) || 0;

  const orderStatus = String(order.status || 'pending').toUpperCase();
  const paymentStatus = String(payment.status || 'pending').toUpperCase();

  const companyLines = textList([
    settings.companyName || settings.shopName,
    settings.address,
    settings.phone ? `Phone: ${settings.phone}` : null,
    settings.phone2 ? `Phone: ${settings.phone2}` : null,
    settings.email ? `Email: ${settings.email}` : null,
    settings.email2 ? `Email: ${settings.email2}` : null,
    settings.trustedSinceYear ? `Trusted since ${settings.trustedSinceYear}` : null
  ]);

  const customerLines = textList([
    customer.name,
    customer.email ? `Email: ${customer.email}` : null,
    customer.phone ? `Phone: ${customer.phone}` : null,
    address.address ? [address.address, address.city, address.state].filter(Boolean).join(', ') : null,
    address.pincode ? `Pincode: ${address.pincode}` : null
  ]);

  /* Item table — every cell is a STORED order item value. */
  const itemBody = [
    [
      { text: 'Product', style: 'tableHeader', alignment: 'left' },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Item Total', style: 'tableHeader', alignment: 'right' }
    ],
    ...items.map((item) => [
      { text: item.productName || '—' },
      { text: String(item.quantity), alignment: 'right' },
      { text: formatINR(item.price), alignment: 'right' },
      { text: formatINR(item.subtotal), alignment: 'right' }
    ])
  ];

  /* Summary — reads the stored pricing snapshot exactly. */
  const summaryRows = [
    ['Subtotal', formatINR(subtotal)]
  ];
  if (discount > 0) {
    summaryRows.push(['Discount', `− ${formatINR(discount)}`]);
  }
  summaryRows.push(['Delivery Charge', formatINR(deliveryCharge)]);
  // GST is never recalculated. Orders are tax-inclusive (stored pricing.gst = 0),
  // so the standard "Inclusive of all taxes" note is shown instead. If an order
  // stored a positive GST value, the stored amount is printed (never recomputed).
  if (gst > 0) {
    summaryRows.push([{ text: 'GST', bold: true }, { text: formatINR(gst), bold: true }]);
  }
  summaryRows.push([
    { text: 'Grand Total', bold: true },
    { text: formatINR(total), bold: true }
  ]);
const content = [
    /* ---------- Header: brand + company details ---------- */
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: String(settings.shopName || 'Vendhan Crackers'), style: 'brand' },
            { text: companyLines, style: 'company' }
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: 'INVOICE', style: 'invoiceTag' },
            { text: ' ', style: 'spacerMini' },
            {
              table: {
                widths: ['auto', 'auto'],
                body: [
                  [{ text: 'Invoice No.', style: 'fieldLabel' }, { text: order.orderId || '—', alignment: 'right', bold: true }],
                  [{ text: 'Order Date', style: 'fieldLabel' }, { text: formatDateTime(order.createdAt), alignment: 'right' }],
                  [{ text: 'Order Status', style: 'fieldLabel' }, { text: orderStatus, alignment: 'right' }],
                  [{ text: 'Payment', style: 'fieldLabel' }, { text: `${String(payment.method || 'cod').toUpperCase()} · ${paymentStatus}`, alignment: 'right' }]
                ]
              },
              layout: 'noBorders'
            }
          ]
        }
      ]
    },
    { text: ' ', style: 'spacer' },

    /* ---------- Billed to ---------- */
    { text: 'BILLED TO', style: 'sectionHeader' },
    { text: customerLines, style: 'customer' },
    { text: ' ', style: 'spacer' },

    /* ---------- Items ---------- */
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: itemBody
      },
      layout: 'invoiceTableLayout'
    },
    { text: ' ', style: 'spacer' },

    /* ---------- Summary ---------- */
    {
      alignment: 'right',
      table: {
        widths: [130, 110],
        body: summaryRows
      },
      layout: 'summaryLayout'
    },
    { text: ' ', style: 'spacer' },
    {
      text: [
        { text: 'Inclusive of all taxes. ', italics: true },
        { text: 'Thank you for shopping with Vendhan Crackers!', italics: true }
      ],
      style: 'note'
    }
  ];
return {
    content,
    styles: {
      brand: { fontSize: 20, bold: true, color: '#b45309' },
      invoiceTag: { fontSize: 18, bold: true, alignment: 'right', color: '#b45309' },
      company: { fontSize: 9, color: '#555555', margin: [0, 4, 0, 0], lineHeight: 1.35 },
      customer: { fontSize: 10, color: '#333333', lineHeight: 1.45 },
      fieldLabel: { fontSize: 9, color: '#666666' },
      spacer: { fontSize: 6 },
      spacerMini: { fontSize: 3 },
      sectionHeader: { fontSize: 12, bold: true, color: '#b45309', margin: [0, 8, 0, 4] },
      tableHeader: { bold: true, color: '#ffffff', fillColor: '#b45309' },
      note: { fontSize: 9, color: '#666666', margin: [0, 8, 0, 0] }
    },
    defaultStyle: { fontSize: 10, color: '#333333' },
    pageMargins: [36, 40, 36, 40]
  };
}

/**
 * Generate the invoice PDF for a stored order.
 * Company/contact details come from Admin Settings (single source of truth).
 * No pricing is recalculated — every figure is read from the order snapshot.
 *
 * @param {object} order - A stored Order document (ownership already verified).
 * @returns {Promise<Buffer>} PDF file buffer.
 */
async function generateInvoicePdf(order) {
  const settings = await settingsService.getSettings();
  const docDefinition = buildInvoiceDocDefinition(order, settings);

  const pdfmake = require('pdfmake');
  const vfsFonts = require('pdfmake/build/vfs_fonts');

  // Register fonts in the virtual file system (decode base64 to Buffer)
  Object.keys(vfsFonts).forEach((fontName) => {
    pdfmake.virtualfs.storage[fontName] = Buffer.from(vfsFonts[fontName], 'base64');
  });

  pdfmake.setFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  });

  // Allow font loading (same policy as the admin report PDF export)
  pdfmake.setUrlAccessPolicy(() => true);
  pdfmake.setLocalAccessPolicy(() => true);

  const doc = pdfmake.createPdf(docDefinition);
  return doc.getBuffer();
}

module.exports = {
  buildInvoiceDocDefinition,
  generateInvoicePdf,
  formatINR,
  formatNumber,
  formatDate,
  formatDateTime
};