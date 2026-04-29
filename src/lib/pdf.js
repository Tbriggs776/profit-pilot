import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getCustomerFacingLines, lineTotal } from '@/api/estimates';

const COLORS = {
  emerald: [16, 185, 129],
  emeraldDark: [4, 120, 87],
  slate900: [15, 23, 42],
  slate600: [71, 85, 105],
  slate400: [148, 163, 184],
  slate100: [241, 245, 249],
  slate50: [248, 250, 252],
  white: [255, 255, 255],
};

const CATEGORY_LABELS = {
  equipment: 'Equipment',
  material: 'Material',
  labor: 'Labor',
  sub_contractor: 'Sub-contractor',
  custom_pass_through: 'Pass-through',
};

const fmtCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Load an image URL into a data URL for jsPDF
const fetchImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const detectImageFormat = (dataUrl) => {
  if (!dataUrl) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg'))
    return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
};

const drawHeader = async (doc, org, pageWidth) => {
  const margin = 40;
  const headerHeight = 90;

  // Background band
  doc.setFillColor(...COLORS.slate900);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFillColor(...COLORS.emerald);
  doc.rect(0, headerHeight, pageWidth, 4, 'F');

  // Logo
  let textStartX = margin;
  if (org?.logo_url) {
    const logoData = await fetchImageAsDataUrl(org.logo_url);
    if (logoData) {
      try {
        const fmt = detectImageFormat(logoData);
        doc.addImage(logoData, fmt, margin, 20, 50, 50);
        textStartX = margin + 60;
      } catch {
        // ignore
      }
    }
  }

  // Business name + meta
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(org?.business_name || 'Profit Pilot', textStartX, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const lines = [];
  if (org?.address) lines.push(org.address);
  const phoneLine = [org?.phone, org?.website].filter(Boolean).join('  ·  ');
  if (phoneLine) lines.push(phoneLine);
  if (org?.license_number) lines.push(`License # ${org.license_number}`);
  lines.forEach((l, i) => doc.text(l, textStartX, 54 + i * 12));

  return headerHeight + 4;
};

const drawProposalMeta = (doc, estimate, startY, pageWidth) => {
  const margin = 40;
  let y = startY + 30;

  // PROPOSAL title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.slate900);
  doc.text('PROPOSAL', margin, y);

  // Date + estimate ID on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate600);
  const dateStr = estimate?.created_at
    ? format(new Date(estimate.created_at), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');
  doc.text(`Date:  ${dateStr}`, pageWidth - margin, y - 14, { align: 'right' });
  if (estimate?.id) {
    doc.text(
      `Estimate #${estimate.id.slice(0, 8).toUpperCase()}`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );
  }

  y += 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slate900);
  doc.text(estimate?.title || 'Estimate', margin, y);

  return y + 18;
};

const drawCustomerBlock = (doc, customer, startY) => {
  const margin = 40;
  if (!customer) return startY;

  let y = startY + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slate400);
  doc.text('PREPARED FOR', margin, y);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.slate900);
  doc.text(customer.name || '', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate600);
  const detailLines = [];
  if (customer.address) detailLines.push(customer.address);
  const contact = [customer.email, customer.phone].filter(Boolean).join('  ·  ');
  if (contact) detailLines.push(contact);
  detailLines.forEach((l, i) => {
    doc.text(l, margin, y + 14 + i * 12);
  });

  return y + 14 + detailLines.length * 12 + 8;
};

const drawLineItemsTable = (doc, lines, startY, pageWidth) => {
  if (!lines.length) return startY;

  const margin = 40;
  const grouped = {};
  lines.forEach((l) => {
    if (!grouped[l.category]) grouped[l.category] = [];
    grouped[l.category].push(l);
  });

  const orderedCategories = [
    'equipment',
    'material',
    'labor',
    'sub_contractor',
    'custom_pass_through',
  ].filter((c) => grouped[c]?.length);

  // Build a single autotable with category subheader rows
  const body = [];
  orderedCategories.forEach((cat) => {
    body.push([
      {
        content: CATEGORY_LABELS[cat],
        colSpan: 5,
        styles: {
          fillColor: COLORS.slate100,
          textColor: COLORS.slate900,
          fontStyle: 'bold',
          fontSize: 10,
        },
      },
    ]);
    grouped[cat].forEach((l) => {
      body.push([
        l.description || CATEGORY_LABELS[cat],
        Number(l.quantity).toLocaleString(),
        l.unit || 'ea',
        fmtCurrency(l.unit_price),
        fmtCurrency(lineTotal(l)),
      ]);
    });
  });

  autoTable(doc, {
    startY,
    head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: COLORS.emerald,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 50 },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: COLORS.slate100,
      lineWidth: 0.5,
    },
    alternateRowStyles: { fillColor: COLORS.slate50 },
  });

  return doc.lastAutoTable.finalY + 16;
};

const drawTotals = (doc, estimate, startY, pageWidth) => {
  const margin = 40;
  const boxWidth = 240;
  const boxX = pageWidth - margin - boxWidth;
  let y = startY;

  // Selling price band (no cost-exposing subtotal — line items already show
  // customer-facing retail prices that sum to selling_price)
  doc.setFillColor(...COLORS.emerald);
  doc.rect(boxX, y - 14, boxWidth, 32, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', boxX + 12, y + 4);
  doc.setFontSize(16);
  doc.text(fmtCurrency(estimate.selling_price), boxX + boxWidth - 12, y + 6, {
    align: 'right',
  });
  y += 28;

  if (Number(estimate.finance_rate) > 0 && Number(estimate.finance_price) > 0) {
    y += 6;
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(boxX, y - 14, boxWidth, 32, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`FINANCE PRICE (+${estimate.finance_rate}%)`, boxX + 12, y + 4);
    doc.setFontSize(16);
    doc.text(fmtCurrency(estimate.finance_price), boxX + boxWidth - 12, y + 6, {
      align: 'right',
    });
    y += 28;
  }

  return y + 16;
};

const drawNotes = (doc, estimate, startY, pageWidth) => {
  if (!estimate.notes) return startY;
  const margin = 40;
  let y = startY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate900);
  doc.text('Notes', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.slate600);
  const wrapped = doc.splitTextToSize(estimate.notes, pageWidth - margin * 2);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 12 + 12;

  return y;
};

const drawSignature = (doc, startY, pageWidth) => {
  const margin = 40;
  const y = Math.max(startY + 32, doc.internal.pageSize.getHeight() - 120);

  doc.setDrawColor(...COLORS.slate400);
  doc.line(margin, y, margin + 220, y);
  doc.line(pageWidth - margin - 140, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate600);
  doc.text('Customer signature', margin, y + 12);
  doc.text('Date', pageWidth - margin - 140, y + 12);
};

const drawFooter = (doc, org, pageWidth) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate400);
  const footerLine = [
    org?.business_name,
    org?.phone,
    org?.website,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(footerLine || 'Generated by Profit Pilot', pageWidth / 2, pageHeight - 24, {
    align: 'center',
  });
};

export const generateEstimatePDF = async ({ estimate, lines, org, customer }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Hide cost basis from the customer: pro-rata distribute margin across lines
  const customerLines = getCustomerFacingLines(lines, estimate);

  let y = await drawHeader(doc, org, pageWidth);
  y = drawProposalMeta(doc, estimate, y, pageWidth);
  y = drawCustomerBlock(doc, customer, y);
  y = drawLineItemsTable(doc, customerLines, y, pageWidth);
  y = drawTotals(doc, estimate, y, pageWidth);
  y = drawNotes(doc, estimate, y, pageWidth);
  drawSignature(doc, y, pageWidth);
  drawFooter(doc, org, pageWidth);

  return doc;
};

export const downloadEstimatePDF = async (args) => {
  const doc = await generateEstimatePDF(args);
  const safeTitle = (args.estimate?.title || 'estimate')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  doc.save(`proposal-${safeTitle}-${dateStr}.pdf`);
};

export const openEstimatePDF = async (args) => {
  const doc = await generateEstimatePDF(args);
  window.open(doc.output('bloburl'), '_blank');
};
