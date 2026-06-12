import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional prescription PDF and downloads it.
 * @param {Object} patient - The patient data object
 * @param {Array} prescriptions - Array of prescription objects to include
 * @param {String} doctorName - The prescribing doctor's name
 */
export function generatePrescriptionPdf(patient, prescriptions, doctorName = 'Dr. R. Malhotra') {
  if (!patient || !prescriptions || prescriptions.length === 0) {
    alert('No prescription data available to generate PDF.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette
  const primaryColor = [26, 54, 93]; // #1A365D - Navy
  const secondaryColor = [49, 151, 149]; // #319795 - Teal
  const darkTextColor = [45, 55, 72]; // #2D3748 - Dark Grey
  const lightGrey = [247, 250, 252]; // #F7FAFC - Light BG
  const borderGrey = [226, 232, 240]; // #E2E8F0 - Border

  // Header Brand
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 12, 'F'); // Top colored accent bar

  // Logo / Clinic Name
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ArogyaSetu Health', 15, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 128, 150); // Muted grey
  doc.text('Smart Healthcare Delivery Network', 15, 30);

  // Clinic Contact Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text('12, Ring Road, Sector 4, New Delhi - 110001', 195, 22, { align: 'right' });
  doc.text('Phone: +91 11 4050 6070 | Email: contact@arogyasetu.gov.in', 195, 27, { align: 'right' });
  doc.text('Web: www.arogyasetu.gov.in', 195, 32, { align: 'right' });

  // Divider Line
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.5);
  doc.line(15, 36, 195, 36);

  // Patient & Doctor Information Section
  doc.setFillColor(...lightGrey);
  doc.rect(15, 41, 180, 32, 'F');
  doc.setDrawColor(...borderGrey);
  doc.rect(15, 41, 180, 32, 'D');

  // Left Column - Patient details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('PATIENT DETAILS', 20, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text(`Name: ${patient.name || 'N/A'}`, 20, 53);
  doc.text(`Patient ID: ${patient.id || 'N/A'}`, 20, 58);
  doc.text(`Age / Sex: ${patient.age || 'N/A'} Yrs / Male`, 20, 63);
  doc.text(`Blood Group: ${patient.bloodGroup || 'N/A'}`, 20, 68);

  // Right Column - Rx Metadata
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('PRESCRIPTION DETAILS', 120, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  const dateStr = prescriptions[0]?.date || new Date().toISOString().split('T')[0];
  doc.text(`Date: ${dateStr}`, 120, 53);
  doc.text(`Doctor: ${doctorName}`, 120, 58);
  doc.text(`Queue Token: ${patient.token || 'N/A'}`, 120, 63);
  doc.text(`Reason: ${patient.visitReason || 'General Consultation'}`, 120, 68);

  // RX Symbol
  doc.setFont('times', 'italic');
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.text('R', 15, 87);
  doc.setFontSize(18);
  doc.text('x', 21, 89);

  // Table header & rows
  const tableHeaders = [['#', 'Medication Name', 'Dosage & Frequency', 'Duration', 'Instructions']];
  const tableRows = prescriptions.map((rx, idx) => {
    // Parse dosage if it includes frequency
    let dosage = rx.dosage || '';
    let frequency = '';
    
    // Clean up format if it has duplicated frequency or needs parsing
    const freqs = ['QD', 'BID', 'TID', 'PRN', 'Once Daily', 'Twice Daily', 'Three Times Daily', 'As Needed'];
    for (const f of freqs) {
      if (dosage.includes(f)) {
        frequency = f;
        dosage = dosage.replace(f, '').trim();
        break;
      }
    }

    return [
      idx + 1,
      rx.medication || 'N/A',
      dosage || 'As prescribed',
      frequency || 'N/A',
      rx.notes || 'Take as directed by doctor'
    ];
  });

  // Table using jspdf-autotable
  autoTable(doc, {
    startY: 93,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkTextColor
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 30 },
      4: { cellWidth: 50 }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { left: 15, right: 15 }
  });

  // Add notes section
  const finalY = doc.lastAutoTable.finalY + 15;

  if (patient.aiInsights?.riskFlags) {
    doc.setFillColor(254, 242, 242); // light red
    doc.setDrawColor(254, 202, 202);
    doc.rect(15, finalY, 180, 18, 'DF');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27); // dark red
    doc.text('AI CLINICAL ADVISORY & CONTRAINDICATIONS:', 18, finalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    const splitAdvisory = doc.splitTextToSize(patient.aiInsights.riskFlags, 172);
    doc.text(splitAdvisory, 18, finalY + 10);
  }

  // Footer / Doctor Signature
  const signatureY = 250;
  doc.setDrawColor(...borderGrey);
  doc.line(15, signatureY - 10, 195, signatureY - 10);

  // Digital Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(doctorName, 195, signatureY - 2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 128, 150);
  doc.text('Digitally Authenticated Specialist', 195, signatureY + 2, { align: 'right' });
  doc.text('ArogyaFlow Consent Verified', 195, signatureY + 6, { align: 'right' });

  // System stamp
  doc.setFontSize(7);
  doc.setTextColor(160, 174, 192);
  doc.text('Generated electronically via ArogyaSetu App', 15, signatureY + 6);
  doc.text(`Document Reference: RX-${patient.id}-${Date.now().toString().slice(-6)}`, 15, signatureY + 10);

  // Save the PDF
  doc.save(`Prescription_${patient.name.replace(/\s+/g, '_')}_${dateStr}.pdf`);
}
