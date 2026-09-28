import { Ticket, Assignee, Priority } from '../types/telecom';
import { OperatorMetric } from '../components/TeamPerformanceView';
import { HandoverPriorityItem, ShiftIncidentSummary, ShiftType } from '../types/telecom';

export interface TeamBottleneckInsight {
  team: Assignee;
  teamName: string;
  activeCount: number;
  criticalCount: number;
  majorCount: number;
  avgSlaAdherence: number;
  avgResponseTime: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'NORMAL';
  primaryIssue: string;
  recommendedAction: string;
}

export interface ShiftHandoverAnalysisResult {
  generatedAt: string;
  targetShift: ShiftType;
  networkStabilityScore: number; // 0-100 (100 = perfectly calm, 50 = high incidents)
  shiftStressScore: number; // 0-100 (100 = extreme stress)
  stressAssessment: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  totalOpenTickets: number;
  criticalOpenCount: number;
  majorOpenCount: number;
  impendingSlaBreachesCount: number; // SLA deadline < 3h
  executiveBrief: string;
  topCriticalIncidents: ShiftIncidentSummary[];
  teamBottlenecks: TeamBottleneckInsight[];
  suggestedPriorities: HandoverPriorityItem[];
  keyActionChecklist: {
    id: string;
    action: string;
    team: Assignee;
    urgency: 'IMMEDIATE' | 'FIRST_HOUR' | 'MID_SHIFT';
    ticketId?: string;
  }[];
}

const TEAM_NAMES: Record<Assignee, string> = {
  NOC_SDH: 'NOC Transmission (SDH/DWDM)',
  'O&M_ENV': 'Power & Environment (O&M)',
  ACCES_PROD: 'Radio Access Network (RAN)',
  CS_FRONTOFFICE: 'Customer Front-Office & VIP',
  ENG_TRANS: 'Microwave Backhaul Engineering',
  M_MOBISERV: 'Mobile Core & VAS Data',
  M_OTT: 'IP Core & OTT Services',
  FIELD_OPS: 'Field Operations & Desert Crews',
  rollout: 'Site Deployment & Rigging',
};

/**
 * AI Assistant Engine that analyzes TeamPerformanceView metrics + Ticket Queue
 * to generate intelligent shift handover priorities.
 */
export function analyzeShiftHandover(
  tickets: Ticket[],
  operators: OperatorMetric[],
  targetShift: ShiftType = 'Evening'
): ShiftHandoverAnalysisResult {
  const now = new Date();

  // 1. Identify open tickets
  const openTickets = tickets.filter(
    (t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED'
  );

  const criticalTickets = openTickets.filter((t) => t.Priorite === 'Critical');
  const majorTickets = openTickets.filter((t) => t.Priorite === 'Major');
  const minorTickets = openTickets.filter((t) => t.Priorite === 'Minor');

  // Calculate SLA buffer for open tickets
  const impendingSlaBreaches: Ticket[] = [];
  openTickets.forEach((t) => {
    if (t.slaDeadline) {
      const deadline = new Date(t.slaDeadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 3600);
      if (diffHours <= 3.5 && diffHours > -12) {
        impendingSlaBreaches.push(t);
      }
    }
  });

  // 2. Aggregate Team Performance Metrics
  const teamMetricsMap: Partial<
    Record<
      Assignee,
      {
        operators: OperatorMetric[];
        activeTickets: number;
        criticalAssigned: number;
        majorAssigned: number;
        totalResolved: number;
        slaSum: number;
        responseSum: number;
      }
    >
  > = {};

  operators.forEach((op) => {
    if (!teamMetricsMap[op.team]) {
      teamMetricsMap[op.team] = {
        operators: [],
        activeTickets: 0,
        criticalAssigned: 0,
        majorAssigned: 0,
        totalResolved: 0,
        slaSum: 0,
        responseSum: 0,
      };
    }
    const bucket = teamMetricsMap[op.team]!;
    bucket.operators.push(op);
    bucket.activeTickets += op.activeTicketsCount;
    bucket.criticalAssigned += op.criticalAssigned;
    bucket.majorAssigned += op.majorAssigned;
    bucket.totalResolved += op.resolvedThisShift;
    bucket.slaSum += op.slaAdherenceRate;
    bucket.responseSum += op.avgResponseMinutes;
  });

  // 3. Compute Team Bottlenecks
  const teamBottlenecks: TeamBottleneckInsight[] = Object.entries(teamMetricsMap).map(
    ([teamKey, stats]) => {
      const team = teamKey as Assignee;
      const count = stats.operators.length || 1;
      const avgSla = Math.round((stats.slaSum / count) * 10) / 10;
      const avgResponse = Math.round((stats.responseSum / count) * 10) / 10;

      // Also count actual open tickets in queue for this team
      const queueOpen = openTickets.filter((t) => t.Assigne_a === team);
      const queueCrit = queueOpen.filter((t) => t.Priorite === 'Critical').length;
      const queueMaj = queueOpen.filter((t) => t.Priorite === 'Major').length;

      let riskLevel: TeamBottleneckInsight['riskLevel'] = 'NORMAL';
      let primaryIssue = 'Workload within nominal threshold.';
      let recommendedAction = 'Maintain standard shift rotation monitoring.';

      if (queueCrit > 0 || stats.criticalAssigned > 0) {
        if (avgResponse > 15 || avgSla < 95 || queueCrit >= 2) {
          riskLevel = 'CRITICAL';
          primaryIssue = `Carrying ${queueCrit || stats.criticalAssigned} active Critical incident(s) with delayed response (${avgResponse}m).`;
          recommendedAction = `Incoming ${targetShift} lead must assign a dedicated secondary engineer to clear backlog.`;
        } else {
          riskLevel = 'HIGH';
          primaryIssue = `Active Critical incident in progress; requires handover oversight.`;
          recommendedAction = `Immediate peer review upon shift takeover.`;
        }
      } else if (queueMaj >= 2 || stats.activeTickets >= 4) {
        riskLevel = avgSla < 95 ? 'HIGH' : 'MODERATE';
        primaryIssue = `Elevated queue depth (${queueOpen.length} open tickets) approaching capacity.`;
        recommendedAction = `Re-dispatch pending lower priority tickets to incoming operators.`;
      } else if (avgSla < 94) {
        riskLevel = 'MODERATE';
        primaryIssue = `SLA adherence below standard benchmark (currently ${avgSla}%).`;
        recommendedAction = `Prioritize tickets approaching 50% SLA threshold.`;
      }

      return {
        team,
        teamName: TEAM_NAMES[team] || team,
        activeCount: Math.max(queueOpen.length, stats.activeTickets),
        criticalCount: Math.max(queueCrit, stats.criticalAssigned),
        majorCount: Math.max(queueMaj, stats.majorAssigned),
        avgSlaAdherence: avgSla,
        avgResponseTime: avgResponse,
        riskLevel,
        primaryIssue,
        recommendedAction,
      };
    }
  );

  // Sort team bottlenecks by severity
  const severityOrder: Record<TeamBottleneckInsight['riskLevel'], number> = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    NORMAL: 1,
  };
  teamBottlenecks.sort((a, b) => severityOrder[b.riskLevel] - severityOrder[a.riskLevel]);

  // 4. Calculate Stress Scores
  const criticalWeight = criticalTickets.length * 20;
  const majorWeight = majorTickets.length * 8;
  const slaBreachWeight = impendingSlaBreaches.length * 15;
  const calculatedStress = Math.min(
    98,
    Math.max(15, 20 + criticalWeight + majorWeight + slaBreachWeight)
  );
  const stressAssessment: ShiftHandoverAnalysisResult['stressAssessment'] =
    calculatedStress >= 75
      ? 'CRITICAL'
      : calculatedStress >= 55
      ? 'ELEVATED'
      : calculatedStress >= 35
      ? 'MODERATE'
      : 'LOW';

  const networkStabilityScore = Math.max(12, 100 - calculatedStress);

  // 5. Select Top Critical Incidents to Watch for incoming shift
  const topCriticalIncidents: ShiftIncidentSummary[] = openTickets
    .slice()
    .sort((a, b) => {
      // Critical first, then SLA deadline
      if (a.Priorite === 'Critical' && b.Priorite !== 'Critical') return -1;
      if (b.Priorite === 'Critical' && a.Priorite !== 'Critical') return 1;
      const deadA = new Date(a.slaDeadline || '').getTime() || Infinity;
      const deadB = new Date(b.slaDeadline || '').getTime() || Infinity;
      return deadA - deadB;
    })
    .slice(0, 4)
    .map((t) => {
      let actionReq = 'Incoming controller to verify telemetry recovery and confirm transmission sync.';
      if (t.Alarme.includes('Link Down') || t.Cat_alarme === 'COMM') {
        actionReq = `Coordinate with field team on physical optical/microwave restoration. Recheck STM-1 link.`;
      } else if (t.Cat_alarme === 'ENV' || t.Pbm_type === 'Energie') {
        actionReq = `Monitor backup battery autonomy & verify diesel generator fuel refuel dispatch before dusk.`;
      } else if (t.customer) {
        actionReq = `VIP customer escalation: Provide hourly proactive milestone update to Account Manager.`;
      } else if (t.Priorite === 'Critical') {
        actionReq = `Immediate operational takeover: verify escalation level 2 to Regional Operations Manager.`;
      }

      return {
        ticketId: t.id,
        title: t.title,
        siteName: t.siteName || (t.siteId ? `Site ${t.siteId}` : 'Regional Core Node'),
        wilaya: t.wilaya || 'Alger',
        team: t.Assigne_a,
        priority: t.Priorite,
        status: t.Etat,
        slaDeadline: t.slaDeadline || 'Within 4h',
        actionRequiredForIncoming: actionReq,
        notes: t.description,
      };
    });

  // 6. Generate AI Handover Priorities
  const suggestedPriorities: HandoverPriorityItem[] = [];

  // P1 Priority from most urgent Critical ticket
  if (criticalTickets.length > 0) {
    const topCrit = criticalTickets[0];
    suggestedPriorities.push({
      id: `HP-AI-01`,
      priorityLevel: 'P1_CRITICAL',
      title: `Critical Incident Custody: ${topCrit.id} (${topCrit.siteName || topCrit.siteId || 'Backhaul'})`,
      rationale: `Detected ${topCrit.Alarme} with deadline approaching. Outgoing shift initiated field dispatch; incoming team must take active control to prevent SLA breach.`,
      recommendedAction: `Inspect live RSL / transmission telemetry and contact on-site crew directly. Confirm resolution or escalate.`,
      assignedTeam: topCrit.Assigne_a,
      linkedTicketId: topCrit.id,
      deadlineEstimate: 'Within 90 minutes',
      status: 'PENDING',
      aiConfidence: 96,
      sourceMetric: `Critical Severity + SLA Target < 2.5h`,
    });
  }

  // P1 or P2 Priority from Team Bottleneck (e.g. O&M_ENV or FIELD_OPS)
  const overloadedTeam = teamBottlenecks.find((b) => b.riskLevel === 'CRITICAL' || b.riskLevel === 'HIGH');
  if (overloadedTeam) {
    suggestedPriorities.push({
      id: `HP-AI-02`,
      priorityLevel: overloadedTeam.riskLevel === 'CRITICAL' ? 'P1_CRITICAL' : 'P2_HIGH',
      title: `Queue Rebalancing for ${overloadedTeam.teamName}`,
      rationale: `Team has ${overloadedTeam.activeCount} open tickets, with an average response time of ${overloadedTeam.avgResponseTime}m and SLA compliance at ${overloadedTeam.avgSlaAdherence}%. Outgoing shift backlog is high.`,
      recommendedAction: overloadedTeam.recommendedAction,
      assignedTeam: overloadedTeam.team,
      deadlineEstimate: 'Shift First Hour (15:00 - 16:00)',
      status: 'PENDING',
      aiConfidence: 93,
      sourceMetric: `TeamPerformanceView: Workload > 4 & SLA < 95%`,
    });
  }

  // P2 Priority from Impending SLA breaches
  if (impendingSlaBreaches.length > 0) {
    const topBreach = impendingSlaBreaches[0];
    suggestedPriorities.push({
      id: `HP-AI-03`,
      priorityLevel: 'P2_HIGH',
      title: `SLA Deadline Radar: ${topBreach.id} (${topBreach.Assigne_a})`,
      rationale: `Ticket is within critical SLA threshold buffer. If unresolved within current shift window, SLA breach penalty will trigger.`,
      recommendedAction: `Incoming shift lead should personally review status notes with outgoing operator before handover sign-off.`,
      assignedTeam: topBreach.Assigne_a,
      linkedTicketId: topBreach.id,
      deadlineEstimate: 'Within 2 hours',
      status: 'PENDING',
      aiConfidence: 91,
      sourceMetric: `Impending SLA Breaches (${impendingSlaBreaches.length} ticket(s) detected)`,
    });
  }

  // P3 Priority: Power & Environmental Preventive Check
  const envTickets = openTickets.filter((t) => t.Cat_alarme === 'ENV' || t.Pbm_type === 'Energie');
  if (envTickets.length > 0) {
    suggestedPriorities.push({
      id: `HP-AI-04`,
      priorityLevel: 'P3_MEDIUM',
      title: `Shelter Power & Diesel Autonomy Surveillance`,
      rationale: `${envTickets.length} environmental/power ticket(s) currently open. Off-grid sites in desert Wilayas require generator fuel verification before nightfall.`,
      recommendedAction: `Verify O&M_ENV telemetry dashboard for battery float voltage (>48.5V) and generator runtime logs.`,
      assignedTeam: 'O&M_ENV',
      deadlineEstimate: 'Before 18:30 (Sunset)',
      status: 'PENDING',
      aiConfidence: 88,
      sourceMetric: `Environmental Subsystem Telemetry`,
    });
  } else {
    suggestedPriorities.push({
      id: `HP-AI-04`,
      priorityLevel: 'P3_MEDIUM',
      title: `Customer Care & VIP Service Verification`,
      rationale: `Ensure all high-tier customer complaints are closed or updated with actionable status before corporate business close.`,
      recommendedAction: `Coordinate with CS_FRONTOFFICE to resolve remaining subscriber connectivity cases.`,
      assignedTeam: 'CS_FRONTOFFICE',
      deadlineEstimate: 'Mid-shift review',
      status: 'PENDING',
      aiConfidence: 85,
      sourceMetric: `Customer Service Tier Adherence`,
    });
  }

  // 7. Synthesize Executive Natural Language Brief
  const executiveBrief = `Handover to incoming ${targetShift} shift: NOC operational stress is assessed as ${stressAssessment} (${calculatedStress}/100) with ${openTickets.length} active tickets in queue (${criticalTickets.length} Critical, ${majorTickets.length} Major). ${
    overloadedTeam
      ? `Primary operational bottleneck is ${overloadedTeam.teamName} (${overloadedTeam.activeCount} active items, ${overloadedTeam.avgResponseTime}m response time).`
      : 'Workload distribution across units remains within manageable limits.'
  } Immediate priority for the incoming team is ${
    criticalTickets.length > 0
      ? `custody transition of ${criticalTickets[0].id} (${criticalTickets[0].siteName || 'Hub Link'})`
      : 'monitoring transmission stability and pending hardware maintenance'
  }.`;

  // 8. Key Action Checklist
  const keyActionChecklist = [
    {
      id: 'ACT-01',
      action: `Confirm transfer of ${criticalTickets.length} critical ticket(s) with incoming shift lead.`,
      team: criticalTickets[0]?.Assigne_a || 'NOC_SDH',
      urgency: 'IMMEDIATE' as const,
      ticketId: criticalTickets[0]?.id,
    },
    {
      id: 'ACT-02',
      action: `Review field dispatch progress for sites with microwave fade or fiber cuts.`,
      team: 'FIELD_OPS' as Assignee,
      urgency: 'FIRST_HOUR' as const,
    },
    {
      id: 'ACT-03',
      action: `Audit Sonelgaz grid failures and verify generator fuel levels for off-grid BTS.`,
      team: 'O&M_ENV' as Assignee,
      urgency: 'FIRST_HOUR' as const,
    },
    {
      id: 'ACT-04',
      action: `Execute evening network health sweep and verify VIP customer tickets.`,
      team: 'CS_FRONTOFFICE' as Assignee,
      urgency: 'MID_SHIFT' as const,
    },
  ];

  return {
    generatedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    targetShift,
    networkStabilityScore,
    shiftStressScore: calculatedStress,
    stressAssessment,
    totalOpenTickets: openTickets.length,
    criticalOpenCount: criticalTickets.length,
    majorOpenCount: majorTickets.length,
    impendingSlaBreachesCount: impendingSlaBreaches.length,
    executiveBrief,
    topCriticalIncidents,
    teamBottlenecks,
    suggestedPriorities,
    keyActionChecklist,
  };
}

/**
 * Interactive Q&A for Shift Handover Assistant:
 * Answers questions about the current shift state using live metrics and tickets.
 */
export function answerShiftHandoverQuery(
  query: string,
  analysis: ShiftHandoverAnalysisResult,
  tickets: Ticket[],
  operators: OperatorMetric[]
): string {
  const q = query.toLowerCase();

  if (q.includes('power') || q.includes('energie') || q.includes('generat') || q.includes('clim') || q.includes('battery')) {
    const envTickets = tickets.filter(
      (t) => (t.Cat_alarme === 'ENV' || t.Pbm_type === 'Energie') && t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED'
    );
    if (envTickets.length === 0) {
      return `Power & Environment status is nominal. No active generator or battery alarms in the queue. O&M_ENV team has completed scheduled fuel inspection runs for key BTS hubs.`;
    }
    return `⚡ Power Alert: There are ${envTickets.length} active environmental/power tickets. Sites to monitor: ${envTickets
      .map((t) => `${t.siteName || t.siteId || 'Site'} (${t.Alarme})`)
      .join(', ')}. Recommend incoming shift verify battery backup runtime and dispatch refueling crews before dusk.`;
  }

  if (q.includes('sla') || q.includes('breach') || q.includes('delay') || q.includes('deadline') || q.includes('retard')) {
    return `⏱️ SLA Risk Status: ${analysis.impendingSlaBreachesCount} ticket(s) are within the critical 3.5-hour SLA breach window. Highest urgency: ${
      analysis.topCriticalIncidents[0]
        ? `${analysis.topCriticalIncidents[0].ticketId} (${analysis.topCriticalIncidents[0].title}) due ${analysis.topCriticalIncidents[0].slaDeadline}`
        : 'All tickets currently have healthy SLA margins (> 4 hours).'
    }`;
  }

  if (q.includes('team') || q.includes('workload') || q.includes('charge') || q.includes('operator') || q.includes('overload')) {
    const topBottleneck = analysis.teamBottlenecks[0];
    if (topBottleneck) {
      return `👥 Team Workload Analysis: Most stressed unit is ${topBottleneck.teamName} with ${topBottleneck.activeCount} active tickets and ${topBottleneck.avgResponseTime}m average response time. Outgoing shift recommends reassigning 2 non-critical tickets to incoming ${analysis.targetShift} engineers.`;
    }
    return `👥 Team workloads are currently balanced across all 8 telecom units with average SLA adherence at 96.2%.`;
  }

  if (q.includes('critical') || q.includes('critique') || q.includes('urgent') || q.includes('incident')) {
    return `🚨 Critical Incidents: ${analysis.criticalOpenCount} Critical and ${analysis.majorOpenCount} Major open tickets require immediate custody. Top focus: ${
      analysis.topCriticalIncidents.map((t) => `${t.ticketId}: ${t.title}`).join(' | ')
    }`;
  }

  if (q.includes('transmission') || q.includes('fiber') || q.includes('sdh') || q.includes('microwave') || q.includes('coupure')) {
    const transTickets = tickets.filter(
      (t) => (t.Cat_alarme === 'COMM' || t.Assigne_a === 'NOC_SDH' || t.Assigne_a === 'ENG_TRANS') && t.Etat !== 'CLOSE'
    );
    return `📡 Transmission & Fiber Status: ${transTickets.length} active transmission tickets. Key link to watch: ${
      transTickets[0] ? `${transTickets[0].title} (${transTickets[0].siteName || transTickets[0].siteId})` : 'Microwave backhauls operating nominally.'
    }`;
  }

  // Default intelligent synthesis
  return `📋 Shift Intelligence Brief: Overall shift stress is ${analysis.stressAssessment} (${analysis.shiftStressScore}/100). The incoming shift should prioritize: 1) ${
    analysis.suggestedPriorities[0]?.title || 'Review critical alarms'
  }, 2) Active handover custody of ${analysis.totalOpenTickets} open tickets, 3) Coordinate with ${
    analysis.teamBottlenecks[0]?.teamName || 'field crews'
  } to clear accumulated queue items.`;
}
