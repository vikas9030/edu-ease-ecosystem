import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { ReceiptTemplate } from './ReceiptTemplateSettings';

interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  admissionNumber?: string;
  className?: string;
  feeType: string;
  amount: number;
  discount?: number;
  paidAmount: number;
  paidAt: string;
  template?: ReceiptTemplate;
  feeId?: string;
  studentId?: string;
  schoolId?: string;
  paymentId?: string;
  /** If a stored URL exists, download from storage instead of regenerating */
  existingUrl?: string;
}

export async function generateFeeReceipt(data: ReceiptData) {
  // If a stored receipt URL exists, download directly from storage
  if (data.existingUrl) {
    downloadFromUrl(data.existingUrl, 'Receipt_' + data.receiptNumber + '.pdf');
    return;
  }

  const t = data.template;
  const doc = new jsPDF();
  let y = 14;

  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const leftMargin = 14;
  const rightMargin = pageWidth - 14;

  const hasLogo = !!(t?.showLogo && t.logoUrl);
  let logoLoaded: HTMLImageElement | null = null;

  if (hasLogo) {
    try {
      logoLoaded = await loadImage(t!.logoUrl);
    } catch {}
  }

  // School header block — logo centered on top, text centered below
  if (logoLoaded) {
    const logoW = 22;
    const logoH = 22;
    const logoX = centerX - logoW / 2;
    doc.addImage(logoLoaded, 'PNG', logoX, y, logoW, logoH);
    y += logoH + 4;
  }

  if (t?.schoolName) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(t.schoolName, centerX, y, { align: 'center' });
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (t.schoolAddress) {
      doc.text(t.schoolAddress, centerX, y, { align: 'center' });
      y += 4;
    }
    if (t.schoolPhone) {
      doc.text('Ph: ' + t.schoolPhone, centerX, y, { align: 'center' });
      y += 4;
    }
    y += 2;
  }

  // Header title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t?.headerTitle || 'Payment Receipt', centerX, y + 4, { align: 'center' });
  y += 12;

  // Separator line
  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, rightMargin, y);
  y += 8;

  // Receipt No and Date on same line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No: ' + data.receiptNumber, leftMargin, y);
  doc.text('Date: ' + new Date(data.paidAt).toLocaleDateString(), rightMargin, y, { align: 'right' });
  y += 8;

  // Student info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Student: ' + data.studentName, leftMargin, y);
  y += 7;

  const showAdm = t ? t.showAdmissionNumber : true;
  const showClass = t ? t.showClass : true;

  if (showAdm && data.admissionNumber) {
    doc.text('Admission No: ' + data.admissionNumber, leftMargin, y);
    y += 7;
  }
  if (showClass && data.className) {
    doc.text('Class: ' + data.className, leftMargin, y);
    y += 7;
  }
  y += 4;

  // Table data
  const discount = data.discount || 0;
  const netAmount = data.amount - discount;
  const showDiscount = t ? t.showDiscount : true;

  const head = showDiscount
    ? [['Fee Type', 'Amount (Rs.)', 'Discount (Rs.)', 'Net (Rs.)', 'Paid (Rs.)']]
    : [['Fee Type', 'Amount (Rs.)', 'Net (Rs.)', 'Paid (Rs.)']];

  const body = showDiscount
    ? [[data.feeType, data.amount.toLocaleString(), discount.toLocaleString(), netAmount.toLocaleString(), data.paidAmount.toLocaleString()]]
    : [[data.feeType, data.amount.toLocaleString(), netAmount.toLocaleString(), data.paidAmount.toLocaleString()]];

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      halign: 'center',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left' },
    },
    margin: { left: leftMargin, right: 14 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(t?.footerText || 'This is a computer-generated receipt.', centerX, finalY, { align: 'center' });

  // Generate blob
  const pdfBlob = doc.output('blob');

  // Upload to storage in background (don't block download)
  uploadReceiptToStorage(pdfBlob, data).catch(console.error);

  // Direct download
  triggerDownload(pdfBlob, 'Receipt_' + data.receiptNumber + '.pdf');
}

async function uploadReceiptToStorage(pdfBlob: Blob, data: ReceiptData) {
  try {
    const fileName = `${data.receiptNumber}.pdf`;
    const filePath = data.schoolId
      ? `${data.schoolId}/${fileName}`
      : fileName;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Receipt upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    const receiptUrl = urlData?.publicUrl;

    // Update fee_payments record with receipt URL if we have a payment ID
    if (receiptUrl && data.paymentId) {
      await supabase
        .from('fee_payments' as any)
        .update({ receipt_url: receiptUrl } as any)
        .eq('id', data.paymentId);
    } else if (receiptUrl && data.receiptNumber) {
      // Try to find the payment by receipt number
      await supabase
        .from('fee_payments' as any)
        .update({ receipt_url: receiptUrl } as any)
        .eq('receipt_number', data.receiptNumber);
    }
  } catch (err) {
    console.error('Failed to store receipt:', err);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);

  setTimeout(() => {
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }, 100);
}

function downloadFromUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 1000);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
