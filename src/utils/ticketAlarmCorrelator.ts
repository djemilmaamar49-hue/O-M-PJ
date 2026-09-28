import { Ticket, Priority, CatAlarme, Assignee, Etat } from '../types/telecom';

export interface GroupedIncident {
  id: string; // e.g. 'INC-DZ-ALG-014-0905'
  isIncident: true;
  siteId: string;
  siteName: string;
  wilaya: string;
  cluster: string;
  windowStart: string;
  windowEnd: string;
  windowDurationSeconds: number;
  highestPriority: Priority;
  primaryCategory: CatAlarme;
  primaryAlarm: string;
  categories: CatAlarme[];
  status: Etat;
  assignedTeam: Assignee;
  summaryTitle: string;
  rootCauseHypothesis: string;
  recommendedAction: string;
  slaDeadline: string;
  tickets: Ticket[];
  ticketCount: number;
  createdAt: string; // earliest timestamp
  updatedAt: string; // latest timestamp
}

export interface StandaloneTicketItem {
  id: string;
  isIncident: false;
  ticket: Ticket;
}

export type DisplayTicketItem = GroupedIncident | StandaloneTicketItem;

export interface CorrelationStats {
  rawAlarmCount: number;
  incidentCount: number;
  standaloneCount: number;
  totalDisplayed: number;
  noiseReductionPercent: number;
  correlatedAlarmsCount: number;
}

/**
 * Determine severity score for priority comparison
 */
const PRIORITY_SCORES: Record<Priority, number> = {
  Critical: 3,
  Major: 2,
  Minor: 1,
};

/**
 * Infer the likely root cause and title based on telecom alarm combinations
 */
function inferIncidentDetails(siteId: string, siteName: string, alarms: Ticket[]): {
  primaryCategory: CatAlarme;
  primaryAlarm: string;
  summaryTitle: string;
  rootCauseHypothesis: string;
  recommendedAction: string;
  assignedTeam: Assignee;
} {
  const alarmNames = alarms.map((a) => a.Alarme.toLowerCase());
  const categories = alarms.map((a) => a.Cat_alarme);

  // Check Power Outage Cascade (Sonelgaz cut -> Battery low -> Rectifier -> Link Down)
  const hasBattery = alarmNames.some((n) => n.includes('battery') || n.includes('autonomie'));
  const hasRectifier = alarmNames.some((n) => n.includes('rectifier') || n.includes('redresseur'));
  const hasLinkDown = alarmNames.some((n) => n.includes('link down') || n.includes('down'));
  const hasClim = alarmNames.some((n) => n.includes('clim') || n.includes('temp'));
  const hasFiber = alarmNames.some((n) => n.includes('fibre') || n.includes('fiber') || n.includes('optique'));

  if (hasBattery || hasRectifier) {
    return {
      primaryCategory: 'ENV',
      primaryAlarm: hasBattery ? 'Battery Autonomie Depletion' : 'Rectifier Overcurrent Trip',
      summaryTitle: `Power Cascade Outage at ${siteName} (${alarms.length} alarms)`,
      rootCauseHypothesis:
        'Commercial Sonelgaz power interruption triggered rectifier trip with battery bank secondary discharge and link degradation.',
      recommendedAction:
        'Dispatch O&M_ENV field technicians with portable generator and replacement battery modules immediately.',
      assignedTeam: 'O&M_ENV',
    };
  }

  if (hasFiber || hasLinkDown) {
    return {
      primaryCategory: 'COMM',
      primaryAlarm: hasFiber ? 'Fiber Ring Physical Severance' : 'Backhaul Microwave Link Down',
      summaryTitle: `Transmission Backhaul Collapse at ${siteName} (${alarms.length} alarms)`,
      rootCauseHypothesis:
        'Microwave link fade or civil works optical fiber rupture caused tributary BSS carrier drops across sectors.',
      recommendedAction:
        'Escalate to NOC_SDH & ENG_TRANS fiber splicing team. Reroute protection traffic to secondary radio ring.',
      assignedTeam: 'ENG_TRANS',
    };
  }

  if (hasClim) {
    return {
      primaryCategory: 'ENV',
      primaryAlarm: 'Thermal High Temperature Runaway',
      summaryTitle: `Shelter Thermal Overload & Clim Fault at ${siteName} (${alarms.length} alarms)`,
      rootCauseHypothesis:
        'HVAC compressor lockout led to shelter temperature exceeding critical 38°C threshold, forcing RF boards into thermal protection.',
      recommendedAction:
        'Dispatch emergency HVAC maintenance contractor; verify outdoor air dampers and condenser fans.',
      assignedTeam: 'O&M_ENV',
    };
  }

  // Generic fallback
  const firstAlarm = alarms[0];
  return {
    primaryCategory: firstAlarm.Cat_alarme,
    primaryAlarm: firstAlarm.Alarme,
    summaryTitle: `Aggregated Multi-Alarm Incident at ${siteName} (${alarms.length} alarms)`,
    rootCauseHypothesis: `Correlated cluster events on site ${siteId} detected within 5-minute window.`,
    recommendedAction: 'Coordinate with local field operations team to perform site physical inspection.',
    assignedTeam: firstAlarm.Assigne_a,
  };
}

/**
 * Telecom Cluster mapper based on siteId / wilaya
 */
export function getTelecomClusterName(siteId?: string, wilaya?: string): string {
  if (siteId?.includes('ALG')) return 'Alger-Centre Hub Cluster';
  if (siteId?.includes('CST')) return 'Constantine-Est Hub Cluster';
  if (siteId?.includes('ORN')) return 'Oran-Littoral West Cluster';
  if (siteId?.includes('OGL')) return 'Hassi Messaoud Sahara Cluster';
  if (siteId?.includes('BLD')) return 'Mitidja & Chréa Mountain Cluster';
  if (siteId?.includes('ANB')) return 'Seybouse-Annaba Coastal Cluster';
  if (siteId?.includes('STF')) return 'Hauts-Plateaux Sétif Cluster';
  return wilaya ? `${wilaya.replace(/^\d+\s*-\s*/, '')} Regional Cluster` : 'Core Telecom Cluster';
}

/**
 * Correlates multiple alarms arriving within a rolling 5-minute window (300,000ms)
 * from the same cell site into single Incident tickets.
 */
export function correlateTickets(
  tickets: Ticket[],
  windowMinutes: number = 5
): {
  items: DisplayTicketItem[];
  stats: CorrelationStats;
} {
  const windowMs = windowMinutes * 60 * 1000;

  // Group candidates by siteId (or fallback to cluster/wilaya)
  const siteGroupsMap = new Map<string, Ticket[]>();

  tickets.forEach((tkt) => {
    // Only group network alarms and hardware tickets with site correlation
    // Standalone customer support tickets with no siteId remain standalone
    const groupingKey = tkt.siteId ? `SITE:${tkt.siteId}` : (tkt.wilaya ? `WILAYA:${tkt.wilaya}` : `ID:${tkt.id}`);
    const existing = siteGroupsMap.get(groupingKey) || [];
    existing.push(tkt);
    siteGroupsMap.set(groupingKey, existing);
  });

  const displayItems: DisplayTicketItem[] = [];
  let incidentCount = 0;
  let correlatedAlarmsCount = 0;
  let standaloneCount = 0;

  siteGroupsMap.forEach((siteTickets, key) => {
    if (siteTickets.length === 1 || key.startsWith('ID:')) {
      // Single ticket or uncorrelatable
      displayItems.push({
        id: siteTickets[0].id,
        isIncident: false,
        ticket: siteTickets[0],
      });
      standaloneCount++;
      return;
    }

    // Sort site tickets chronologically
    const sorted = [...siteTickets].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Cluster into time windows of <= windowMs
    const clusters: Ticket[][] = [];
    let currentCluster: Ticket[] = [];

    sorted.forEach((ticket) => {
      const ticketTime = new Date(ticket.createdAt).getTime();

      if (currentCluster.length === 0) {
        currentCluster.push(ticket);
      } else {
        const clusterStartTime = new Date(currentCluster[0].createdAt).getTime();
        const lastTicketTime = new Date(currentCluster[currentCluster.length - 1].createdAt).getTime();

        // Check if within window from first ticket in cluster (or chained within window)
        if (ticketTime - clusterStartTime <= windowMs || ticketTime - lastTicketTime <= windowMs) {
          currentCluster.push(ticket);
        } else {
          clusters.push(currentCluster);
          currentCluster = [ticket];
        }
      }
    });

    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Process clusters
    clusters.forEach((cluster) => {
      if (cluster.length >= 2) {
        // Multi-alarm cluster -> Form a GroupedIncident!
        const earliest = cluster[0];
        const latest = cluster[cluster.length - 1];
        const siteId = earliest.siteId || 'DZ-CORE-00';
        const siteName = earliest.siteName || earliest.wilaya || 'Network Site';
        const wilaya = earliest.wilaya || 'Algeria';
        const clusterName = getTelecomClusterName(siteId, wilaya);

        const startTime = new Date(earliest.createdAt).getTime();
        const endTime = new Date(latest.createdAt).getTime();
        const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

        // Find highest priority
        let highestPriority: Priority = 'Minor';
        cluster.forEach((t) => {
          if (PRIORITY_SCORES[t.Priorite] > PRIORITY_SCORES[highestPriority]) {
            highestPriority = t.Priorite;
          }
        });

        // Determine status (if any OPEN -> OPEN, else if any IN_PROGRESS -> IN_PROGRESS, etc.)
        let overallStatus: Etat = 'CLOSE';
        if (cluster.some((t) => t.Etat === 'OPEN')) {
          overallStatus = 'OPEN';
        } else if (cluster.some((t) => t.Etat === 'IN_PROGRESS')) {
          overallStatus = 'IN_PROGRESS';
        } else if (cluster.some((t) => t.Etat === 'PENDING_PARTS')) {
          overallStatus = 'PENDING_PARTS';
        } else if (cluster.some((t) => t.Etat === 'RESOLVED')) {
          overallStatus = 'RESOLVED';
        }

        // Get strictest SLA deadline
        const slaDeadline = cluster.reduce((minSla, t) => {
          return new Date(t.slaDeadline) < new Date(minSla) ? t.slaDeadline : minSla;
        }, cluster[0].slaDeadline);

        const inferred = inferIncidentDetails(siteId, siteName, cluster);
        const categories = Array.from(new Set(cluster.map((t) => t.Cat_alarme)));

        const dateSuffix = earliest.createdAt.slice(11, 16).replace(':', '');
        const incidentId = `INC-${siteId.replace('DZ-', '')}-${dateSuffix}`;

        const incident: GroupedIncident = {
          id: incidentId,
          isIncident: true,
          siteId,
          siteName,
          wilaya,
          cluster: clusterName,
          windowStart: earliest.createdAt,
          windowEnd: latest.createdAt,
          windowDurationSeconds: durationSec,
          highestPriority,
          primaryCategory: inferred.primaryCategory,
          primaryAlarm: inferred.primaryAlarm,
          categories,
          status: overallStatus,
          assignedTeam: inferred.assignedTeam,
          summaryTitle: inferred.summaryTitle,
          rootCauseHypothesis: inferred.rootCauseHypothesis,
          recommendedAction: inferred.recommendedAction,
          slaDeadline,
          tickets: cluster,
          ticketCount: cluster.length,
          createdAt: earliest.createdAt,
          updatedAt: latest.updatedAt,
        };

        displayItems.push(incident);
        incidentCount++;
        correlatedAlarmsCount += cluster.length;
      } else {
        // Only 1 ticket in this cluster -> Standalone
        displayItems.push({
          id: cluster[0].id,
          isIncident: false,
          ticket: cluster[0],
        });
        standaloneCount++;
      }
    });
  });

  // Sort displayItems by timestamp descending
  displayItems.sort((a, b) => {
    const timeA = new Date(a.isIncident ? a.createdAt : a.ticket.createdAt).getTime();
    const timeB = new Date(b.isIncident ? b.createdAt : b.ticket.createdAt).getTime();
    return timeB - timeA;
  });

  const totalRaw = tickets.length;
  const totalDisplayed = displayItems.length;
  const reductionPercent = totalRaw > 0 ? Math.round(((totalRaw - totalDisplayed) / totalRaw) * 100) : 0;

  return {
    items: displayItems,
    stats: {
      rawAlarmCount: totalRaw,
      incidentCount,
      standaloneCount,
      totalDisplayed,
      noiseReductionPercent: Math.max(0, reductionPercent),
      correlatedAlarmsCount,
    },
  };
}
