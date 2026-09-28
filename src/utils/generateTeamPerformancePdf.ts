import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OperatorMetric } from '../components/TeamPerformanceView';
import { Ticket } from '../types/telecom';
import { TEAM_LABELS } from '../data/telecomConstants';

export interface PerformanceReportOptions {
  operators: OperatorMetric[];
  totalResolved: number;
  totalActiveWorkload: number;
  avgResponse: string | number;
  avgSla: string | number;
  shiftFilter: string;
  teamFilter: string;
  sortBy: string;
  sortOrder: string;
  tickets?: Ticket[];
  executiveNotes?: string;
  reviewerName?: string;
  reviewerRole?: string;
}

/**
 * Generates and downloads an executive-grade PDF performance report
 * for NOC management review.
 */
export function generateTeamPerformancePdf(options: PerformanceReportOptions): void {
  const {
    operators,
    totalResolved,
    totalActiveWorkload,
    avgResponse,
    avgSla,
    shiftFilter,
    teamFilter,
    sortBy,
    sortOrder,
    tickets = [],
    executiveNotes,
    reviewerName = 'NOC Operations Director',
    reviewerRole = 'Telecom Infrastructure & Operations',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const djezzyRed = [227, 6, 19] as [number, number, number];
  const darkSlate = [15, 23, 42] as [number, number, number];
  const mutedSlate = [100, 116, 139] as [number, number, number];
  const borderGray = [226, 232, 240] as [number, number, number];
  const lightBg = [248, 250, 252] as [number, number, number];

  const currentDate = new Date();
  const reportDateStr = currentDate.toISOString().slice(0, 10);
  const reportTimestamp = currentDate.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const reportId = `NOC-PERF-${reportDateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let currentY = margin;

  // ==========================================
  // 1. TOP HEADER & BRANDING
  // ==========================================
  // Red accent top bar
  doc.setFillColor(...djezzyRed);
  doc.rect(margin, currentY, contentWidth, 3, 'F');
  currentY += 7;

  // Header Title Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkSlate);
  doc.text('DJEZZY NOC — TEAM PERFORMANCE REPORT', margin, currentY);

  // Classification Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(pageWidth - margin - 52, currentY - 5, 52, 6, 1, 1, 'FD');
  doc.setTextColor(...djezzyRed);
  doc.text('MANAGEMENT REVIEW · STRICTLY INTERNAL', pageWidth - margin - 50, currentY - 1);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedSlate);
  doc.text('Operational Velocity, Operator Statistics & Shift Handover Governance', margin, currentY);

  currentY += 6;

  // Meta Information Bar (Gray Box)
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(...mutedSlate);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT ID:', margin + 4, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(reportId, margin + 22, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('GENERATED:', margin + 70, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(reportTimestamp, margin + 90, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('OPERATORS IN SCOPE:', margin + 135, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(`${operators.length} Active`, margin + 168, currentY + 4.5);

  // Row 2 of metadata box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('SHIFT FILTER:', margin + 4, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(shiftFilter === 'ALL' ? 'All Shifts (24/7 Cycle)' : shiftFilter, margin + 24, currentY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('UNIT FILTER:', margin + 70, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(teamFilter === 'ALL' ? 'All Telecom Units' : teamFilter, margin + 90, currentY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('SORTED BY:', margin + 135, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(`${sortBy.toUpperCase()} (${sortOrder.toUpperCase()})`, margin + 153, currentY + 10.5);

  currentY += 19;

  // ==========================================
  // 2. EXECUTIVE KPI CARDS (4 Columns)
  // ==========================================
  const totalTarget = operators.reduce((sum, o) => sum + o.resolvedTarget, 0);
  const targetMetRate = totalTarget > 0 ? Math.round((totalResolved / totalTarget) * 100) : 100;
  const criticalTotal = operators.reduce((sum, o) => sum + o.criticalAssigned, 0);
  const majorTotal = operators.reduce((sum, o) => sum + o.majorAssigned, 0);
  const minorTotal = operators.reduce((sum, o) => sum + o.minorAssigned, 0);

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;

  // Card 1: Resolved Tickets
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedSlate);
  doc.text('TICKETS RESOLVED', margin + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(...darkSlate);
  doc.text(String(totalResolved), margin + 3, currentY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129); // green
  doc.text(`${targetMetRate}% of target (${totalTarget})`, margin + 3, currentY + 18);

  // Card 2: Average Response Time
  const card2X = margin + cardWidth + 3;
  doc.setFillColor(...lightBg);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedSlate);
  doc.text('AVG RESPONSE TIME', card2X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(...darkSlate);
  doc.text(`${avgResponse}m`, card2X + 3, currentY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const respNum = parseFloat(String(avgResponse));
  if (respNum <= 15) {
    doc.setTextColor(16, 185, 129);
    doc.text('Optimal (< 15m benchmark)', card2X + 3, currentY + 18);
  } else if (respNum <= 20) {
    doc.setTextColor(245, 158, 11);
    doc.text('Within SLA (< 20m target)', card2X + 3, currentY + 18);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text('Over Target (> 20m threshold)', card2X + 3, currentY + 18);
  }

  // Card 3: SLA Adherence Rate
  const card3X = margin + (cardWidth + 3) * 2;
  doc.setFillColor(...lightBg);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedSlate);
  doc.text('SLA ADHERENCE RATE', card3X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text(`${avgSla}%`, card3X + 3, currentY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedSlate);
  doc.text('Target baseline: >= 95.0%', card3X + 3, currentY + 18);

  // Card 4: Active Workload Backlog
  const card4X = margin + (cardWidth + 3) * 3;
  doc.setFillColor(...lightBg);
  doc.roundedRect(card4X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedSlate);
  doc.text('ACTIVE WORKLOAD', card4X + 3, currentY + 5);
  doc.setFontSize(14);
  doc.setTextColor(245, 158, 11);
  doc.text(`${totalActiveWorkload} Cases`, card4X + 3, currentY + 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(`P1: ${criticalTotal} | P2: ${majorTotal} | P3: ${minorTotal}`, card4X + 3, currentY + 18);

  currentY += cardHeight + 7;

  // ==========================================
  // 3. TELECOM UNIT BREAKDOWN SUMMARY TABLE
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkSlate);
  doc.text('1. TELECOM UNIT WORKLOAD & PERFORMANCE BREAKDOWN', margin, currentY);
  currentY += 3;

  // Aggregate by unit
  const unitsMap = new Map<
    string,
    {
      unit: string;
      operatorsCount: number;
      resolved: number;
      target: number;
      activeWorkload: number;
      critical: number;
      totalResp: number;
      totalSla: number;
    }
  >();

  operators.forEach((op) => {
    const existing = unitsMap.get(op.team) || {
      unit: op.team,
      operatorsCount: 0,
      resolved: 0,
      target: 0,
      activeWorkload: 0,
      critical: 0,
      totalResp: 0,
      totalSla: 0,
    };
    existing.operatorsCount += 1;
    existing.resolved += op.resolvedThisShift;
    existing.target += op.resolvedTarget;
    existing.activeWorkload += op.activeTicketsCount;
    existing.critical += op.criticalAssigned;
    existing.totalResp += op.avgResponseMinutes;
    existing.totalSla += op.slaAdherenceRate;
    unitsMap.set(op.team, existing);
  });

  const unitRows = Array.from(unitsMap.values()).map((u) => {
    const label = TEAM_LABELS[u.unit as keyof typeof TEAM_LABELS] || u.unit;
    const avgUResp = (u.totalResp / u.operatorsCount).toFixed(1);
    const avgUSla = (u.totalSla / u.operatorsCount).toFixed(1);
    const targetAchieved = u.resolved >= u.target ? 'YES' : 'LAGGING';
    return [
      `${u.unit} (${label})`,
      String(u.operatorsCount),
      `${u.resolved} / ${u.target}`,
      targetAchieved,
      `${avgUResp}m`,
      `${avgUSla}%`,
      String(u.activeWorkload),
      String(u.critical),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Telecom Department',
        'Staff',
        'Resolved / Target',
        'Target Met',
        'Avg Response',
        'SLA Compliance',
        'Active Workload',
        'P1 Criticals',
      ],
    ],
    body: unitRows,
    theme: 'grid',
    headStyles: {
      fillColor: djezzyRed,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: darkSlate,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 16 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // 4. DETAILED OPERATOR PERFORMANCE & STATISTICS TABLE
  // ==========================================
  // Check if we have enough room on page 1, or start a new page
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkSlate);
  doc.text('2. INDIVIDUAL OPERATOR PRODUCTIVITY & SLA LEDGER', margin, currentY);
  currentY += 3;

  const operatorRows = operators.map((op) => {
    const statusText = op.resolvedThisShift >= op.resolvedTarget ? 'MET' : 'BELOW';
    const cleanShift = op.shift.replace(/\s*\(.*\)/, '');
    return [
      op.id,
      op.name,
      op.role,
      op.team,
      cleanShift,
      `${op.resolvedThisShift} / ${op.resolvedTarget}`,
      `${op.avgResponseMinutes}m`,
      `${op.avgResolutionHours}h`,
      `${op.slaAdherenceRate}%`,
      `${op.activeTicketsCount} (${op.criticalAssigned}P1/${op.majorAssigned}P2)`,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'ID',
        'Operator Name',
        'Role',
        'Team',
        'Shift',
        'Resolved/Obj',
        'Response',
        'MTTR',
        'SLA',
        'Workload (P1/P2)',
        'Status',
      ],
    ],
    body: operatorRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // dark slate
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: darkSlate,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 36 },
      3: { cellWidth: 18 },
      4: { cellWidth: 15 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 13, halign: 'right' },
      9: { cellWidth: 20, halign: 'center' },
      10: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color-code target status
      if (data.section === 'body' && data.column.index === 10) {
        if (data.cell.raw === 'MET') {
          data.cell.styles.textColor = [16, 185, 129];
        } else {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
      // Color-code response time
      if (data.section === 'body' && data.column.index === 6) {
        const val = parseFloat(String(data.cell.raw));
        if (val > 20) {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (val <= 12) {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // 5. MANAGEMENT FINDINGS & OPERATIONAL RISK HIGHLIGHTS
  // ==========================================
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkSlate);
  doc.text('3. OPERATIONAL FINDINGS & MANAGEMENT ACTIONS', margin, currentY);
  currentY += 4;

  // Identify top performers and risk areas
  const topOperators = [...operators]
    .sort((a, b) => b.slaAdherenceRate - a.slaAdherenceRate || b.resolvedThisShift - a.resolvedThisShift)
    .slice(0, 2);

  const delayedOperators = operators.filter((o) => o.avgResponseMinutes > 20);
  const heavyWorkloadOperators = operators.filter((o) => o.activeTicketsCount >= 4 || o.criticalAssigned >= 2);

  // Box for Key Findings
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, currentY, contentWidth, 28, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('★ TOP SHIFT PERFORMERS:', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  const topText = topOperators
    .map((o) => `${o.name} (${o.team} · SLA: ${o.slaAdherenceRate}% · Resolved: ${o.resolvedThisShift}/${o.resolvedTarget})`)
    .join('  |  ');
  doc.text(topText, margin + 4, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text('▲ BOTTLENECK & CAPACITY ALERTS:', margin + 4, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  let bottleneckText = '';
  if (heavyWorkloadOperators.length > 0) {
    bottleneckText = `High incident queue: ${heavyWorkloadOperators.map((o) => `${o.name} (${o.activeTicketsCount} open, ${o.criticalAssigned} P1)`).join(', ')}.`;
  }
  if (delayedOperators.length > 0) {
    bottleneckText += ` Response time delay: ${delayedOperators.map((o) => `${o.name} (${o.avgResponseMinutes}m)`).join(', ')}.`;
  }
  if (!bottleneckText) {
    bottleneckText = 'No severe capacity or SLA breach risks detected in this reporting period.';
  }
  doc.text(bottleneckText, margin + 4, currentY + 19.5, { maxWidth: contentWidth - 8 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('• RECOMMENDED ACTIONS:', margin + 4, currentY + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedSlate);
  const actionText =
    executiveNotes ||
    'Prioritize clearing P1 Critical tickets in Power & Environment; dispatch field standby teams for Desert wilayas; verify generator fuel deliveries prior to evening handover.';
  doc.text(actionText, margin + 40, currentY + 24.5, { maxWidth: contentWidth - 44 });

  currentY += 34;

  // ==========================================
  // 6. MANAGEMENT REVIEW & SIGN-OFF SECTION
  // ==========================================
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkSlate);
  doc.text('4. MANAGEMENT SIGN-OFF & OPERATIONAL APPROVAL', margin, currentY);
  currentY += 4;

  const signBoxWidth = (contentWidth - 6) / 2;
  const signBoxHeight = 24;

  // Supervisor Sign-off
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, currentY, signBoxWidth, signBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('NOC SHIFT SUPERVISOR / LEAD', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text('Name: Farid Belhadj / Shift Duty Lead', margin + 4, currentY + 10);
  doc.text(`Date Verified: ${reportDateStr}`, margin + 4, currentY + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedSlate);
  doc.text('Signature: [Digitally Verified in Djezzy Portal]', margin + 4, currentY + 19);

  // Operations Director Approval
  const signBox2X = margin + signBoxWidth + 6;
  doc.setFillColor(...lightBg);
  doc.roundedRect(signBox2X, currentY, signBoxWidth, signBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedSlate);
  doc.text('NOC OPERATIONS DIRECTOR / MANAGEMENT REVIEW', signBox2X + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkSlate);
  doc.text(`Reviewer: ${reviewerName} (${reviewerRole})`, signBox2X + 4, currentY + 10);
  doc.text(`Status: APPROVED FOR SHIFT ARCHIVE & KPI AUDIT`, signBox2X + 4, currentY + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedSlate);
  doc.text('Formal Stamp: DJEZZY NOC OPERATIONS - ALGIERS HQ', signBox2X + 4, currentY + 19);

  // ==========================================
  // 7. RUNNING HEADERS & FOOTERS (All Pages)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages > 1)
    if (i > 1) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...mutedSlate);
      doc.text('DJEZZY NOC — TEAM PERFORMANCE REPORT (MANAGEMENT REVIEW)', margin, 10);
      doc.setFont('helvetica', 'normal');
      doc.text(reportId, pageWidth - margin - 35, 10);
      doc.setDrawColor(...borderGray);
      doc.line(margin, 12, pageWidth - margin, 12);
    }

    // Running Footer
    doc.setDrawColor(...borderGray);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text('Djezzy Telecom · Direction Générale Réseau & Systèmes · Centre de Supervision NOC', margin, pageHeight - 7);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - 18, pageHeight - 7);
  }

  // Trigger download
  const filename = `Djezzy_NOC_Performance_Report_${reportDateStr}_${shiftFilter}_${teamFilter}.pdf`;
  doc.save(filename);
}
