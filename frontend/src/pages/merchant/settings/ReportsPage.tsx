import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { merchantManageApi } from '../../../services/api';
import FadeIn from '../../../components/ui/FadeIn';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportData {
  merchant: {
    id: string;
    name: string;
    trade_name: string;
  };
  period: {
    start_date: string | null;
    end_date: string | null;
  };
  summary: {
    total_forms: number;
    total_sales: number;
    total_refund: number;
    avg_amount: number;
    validated: number;
    pending: number;
    refunded: number;
    cancelled: number;
    refused: number;
  };
  by_outlet: {
    id: string;
    name: string;
    code: string;
    forms_count: number;
    total_sales: number;
    total_refund: number;
  }[];
  by_nationality: {
    code: string;
    name: string;
    flag: string;
    count: number;
    total_amount: number;
  }[];
  by_month: {
    month: string;
    month_label: string;
    forms_count: number;
    total_sales: number;
    total_refund: number;
    validated: number;
    validation_rate: number;
  }[];
  forms_detail: {
    form_number: string;
    status: string;
    created_at: string;
    validated_at: string;
    issued_at: string;
    outlet_name: string;
    outlet_code: string;
    traveler_name: string;
    traveler_passport: string;
    traveler_nationality: string;
    total_amount: number;
    tva_amount: number;
    refund_amount: number;
    items_count: number;
  }[];
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['merchant-reports', startDate, endDate],
    queryFn: () => merchantManageApi.reports.get({ 
      start_date: startDate || undefined, 
      end_date: endDate || undefined 
    }),
  });

  const report: ReportData | null = reportData?.data || null;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CDF';
  };

  const formatShortAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
  };

  // Chart data for monthly evolution
  const monthlyChartData = {
    labels: report?.by_month.map(m => m.month_label.split(' ')[0]) || [],
    datasets: [
      {
        label: 'Ventes',
        data: report?.by_month.map(m => m.total_sales) || [],
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
      {
        label: 'TVA',
        data: report?.by_month.map(m => m.total_refund) || [],
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
    ],
  };

  // Chart data for status distribution
  const statusChartData = {
    labels: ['Validés', 'En attente', 'Remboursés', 'Annulés', 'Refusés'],
    datasets: [{
      data: [
        report?.summary.validated || 0,
        report?.summary.pending || 0,
        report?.summary.refunded || 0,
        report?.summary.cancelled || 0,
        report?.summary.refused || 0,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#6b7280', '#ef4444'],
      borderWidth: 0,
    }],
  };

  // Status labels for display
  const statusLabels: Record<string, string> = {
    CREATED: 'Créé',
    ISSUED: 'Émis',
    PENDING: 'En attente',
    VALIDATED: 'Validé',
    REFUSED: 'Refusé',
    REFUNDED: 'Remboursé',
    CANCELLED: 'Annulé',
  };

  // Helper function to format numbers with thousands separator
  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR');
  };

  // Export to Excel - Professional multi-sheet workbook
  const exportToExcel = () => {
    if (!report) return;

    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR');
    const periodStr = `${report.period.start_date || 'Début'} au ${report.period.end_date || 'Aujourd\'hui'}`;

    // ========== FEUILLE 1: RÉSUMÉ EXÉCUTIF ==========
    const summaryData = [
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    📊 RAPPORT TAX FREE - SYNTHÈSE EXÉCUTIVE'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  INFORMATIONS GÉNÉRALES                                                      │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    🏢 Entreprise', report.merchant.name],
      ['    🏪 Nom commercial', report.merchant.trade_name || '-'],
      ['    📅 Date du rapport', `${dateStr} à ${timeStr}`],
      ['    📆 Période analysée', periodStr],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  INDICATEURS CLÉS DE PERFORMANCE (KPI)                                       │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    Indicateur', 'Valeur', 'Unité'],
      ['    ─────────────────────────────', '─────────────────', '──────────'],
      ['    📋 Total des bordereaux émis', formatNumber(report.summary.total_forms), 'bordereaux'],
      ['    💰 Chiffre d\'affaires total', formatNumber(report.summary.total_sales), 'CDF'],
      ['    🧾 TVA collectée totale', formatNumber(report.summary.total_refund), 'CDF'],
      ['    📈 Montant moyen par bordereau', formatNumber(Math.round(report.summary.avg_amount)), 'CDF'],
      ['    ✅ Taux de validation', report.summary.total_forms > 0 ? ((report.summary.validated / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%', ''],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  RÉPARTITION PAR STATUT                                                      │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    Statut', 'Nombre', 'Pourcentage'],
      ['    ─────────────────────────────', '──────────', '──────────'],
      ['    ✅ Validés par la douane', report.summary.validated, report.summary.total_forms > 0 ? ((report.summary.validated / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%'],
      ['    ⏳ En attente de validation', report.summary.pending, report.summary.total_forms > 0 ? ((report.summary.pending / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%'],
      ['    💵 Remboursés aux voyageurs', report.summary.refunded, report.summary.total_forms > 0 ? ((report.summary.refunded / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%'],
      ['    ❌ Annulés', report.summary.cancelled, report.summary.total_forms > 0 ? ((report.summary.cancelled / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%'],
      ['    🚫 Refusés', report.summary.refused, report.summary.total_forms > 0 ? ((report.summary.refused / report.summary.total_forms) * 100).toFixed(1) + '%' : '0%'],
      [''],
      ['    ═══════════════════════════════════════════════════════════════════════════'],
      ['    📊 TOTAL GÉNÉRAL', report.summary.total_forms, 'bordereaux'],
      ['    ═══════════════════════════════════════════════════════════════════════════'],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Résumé');

    // ========== FEUILLE 2: POINTS DE VENTE ==========
    const outletHeaders = [
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    🏪 ANALYSE DÉTAILLÉE PAR POINT DE VENTE'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['#', 'Point de vente', 'Code', 'Nb Bordereaux', 'Ventes (CDF)', 'TVA (CDF)', 'Part CA', 'Moy/Bordereau'],
      ['───', '─────────────────────────', '────────────', '──────────────', '─────────────────', '─────────────────', '────────', '──────────────'],
    ];
    const totalSales = report.summary.total_sales || 1;
    const outletRows = report.by_outlet.map((o, idx) => [
      idx + 1,
      o.name,
      o.code,
      o.forms_count,
      formatNumber(o.total_sales),
      formatNumber(o.total_refund),
      ((o.total_sales / totalSales) * 100).toFixed(1) + '%',
      formatNumber(o.forms_count > 0 ? Math.round(o.total_sales / o.forms_count) : 0),
    ]);
    const outletTotals = [
      ['───', '─────────────────────────', '────────────', '──────────────', '─────────────────', '─────────────────', '────────', '──────────────'],
      ['', '📊 TOTAL', '', 
        report.by_outlet.reduce((sum, o) => sum + o.forms_count, 0),
        formatNumber(report.by_outlet.reduce((sum, o) => sum + o.total_sales, 0)),
        formatNumber(report.by_outlet.reduce((sum, o) => sum + o.total_refund, 0)),
        '100%',
        ''
      ],
      ['═══', '═════════════════════════', '════════════', '══════════════', '═════════════════', '═════════════════', '════════', '══════════════'],
    ];
    const wsOutlets = XLSX.utils.aoa_to_sheet([...outletHeaders, ...outletRows, ...outletTotals]);
    wsOutlets['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsOutlets, '🏪 Points de vente');

    // ========== FEUILLE 3: NATIONALITÉS ==========
    const natHeaders = [
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    🌍 ANALYSE PAR NATIONALITÉ DES VOYAGEURS'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['#', 'Pays', 'Code ISO', 'Nb Bordereaux', 'Montant total (CDF)', 'Part du total', 'Montant moyen'],
      ['───', '─────────────────────────', '──────────', '──────────────', '────────────────────', '─────────────', '──────────────'],
    ];
    const totalAmount = report.by_nationality.reduce((sum, n) => sum + n.total_amount, 0) || 1;
    const natRows = report.by_nationality.map((n, idx) => [
      idx + 1,
      `${n.flag} ${n.name}`,
      n.code,
      n.count,
      formatNumber(n.total_amount),
      ((n.total_amount / totalAmount) * 100).toFixed(1) + '%',
      formatNumber(n.count > 0 ? Math.round(n.total_amount / n.count) : 0),
    ]);
    const natTotals = [
      ['───', '─────────────────────────', '──────────', '──────────────', '────────────────────', '─────────────', '──────────────'],
      ['', '🌍 TOTAL', '',
        report.by_nationality.reduce((sum, n) => sum + n.count, 0),
        formatNumber(report.by_nationality.reduce((sum, n) => sum + n.total_amount, 0)),
        '100%',
        ''
      ],
      ['═══', '═════════════════════════', '══════════', '══════════════', '════════════════════', '═════════════', '══════════════'],
    ];
    const wsNat = XLSX.utils.aoa_to_sheet([...natHeaders, ...natRows, ...natTotals]);
    wsNat['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsNat, '🌍 Nationalités');

    // ========== FEUILLE 4: ÉVOLUTION MENSUELLE ==========
    const monthHeaders = [
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    📈 ÉVOLUTION MENSUELLE DE L\'ACTIVITÉ'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['#', 'Mois', 'Nb Bordereaux', 'Ventes (CDF)', 'TVA (CDF)', 'Validés', 'Taux validation', 'Évolution'],
      ['───', '──────────────────', '──────────────', '─────────────────', '─────────────────', '────────', '───────────────', '──────────'],
    ];
    const monthRows = report.by_month.map((m, idx) => {
      const prevMonth = idx > 0 ? report.by_month[idx - 1] : null;
      let evolution = '-';
      if (prevMonth && prevMonth.total_sales > 0) {
        const pct = ((m.total_sales - prevMonth.total_sales) / prevMonth.total_sales) * 100;
        evolution = pct >= 0 ? `↑ +${pct.toFixed(1)}%` : `↓ ${pct.toFixed(1)}%`;
      }
      return [
        idx + 1,
        m.month_label,
        m.forms_count,
        formatNumber(m.total_sales),
        formatNumber(m.total_refund),
        m.validated,
        m.validation_rate + '%',
        evolution,
      ];
    });
    const monthTotals = [
      ['───', '──────────────────', '──────────────', '─────────────────', '─────────────────', '────────', '───────────────', '──────────'],
      ['', '📊 TOTAL / MOYENNE', 
        report.by_month.reduce((sum, m) => sum + m.forms_count, 0),
        formatNumber(report.by_month.reduce((sum, m) => sum + m.total_sales, 0)),
        formatNumber(report.by_month.reduce((sum, m) => sum + m.total_refund, 0)),
        report.by_month.reduce((sum, m) => sum + m.validated, 0),
        report.by_month.length > 0 
          ? (report.by_month.reduce((sum, m) => sum + m.validation_rate, 0) / report.by_month.length).toFixed(1) + '%' 
          : '0%',
        ''
      ],
      ['═══', '══════════════════', '══════════════', '═════════════════', '═════════════════', '════════', '═══════════════', '══════════'],
    ];
    const wsMonth = XLSX.utils.aoa_to_sheet([...monthHeaders, ...monthRows, ...monthTotals]);
    wsMonth['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 17 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsMonth, '📈 Évolution mensuelle');

    // ========== FEUILLE 5: LISTE DÉTAILLÉE DES BORDEREAUX ==========
    const formsCount = (report.forms_detail || []).length;
    const formsHeaders = [
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      [`                    📋 LISTE DÉTAILLÉE DES BORDEREAUX (${formsCount} bordereau${formsCount > 1 ? 'x' : ''})`],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['#', 'N° Bordereau', 'Statut', 'Date création', 'Date validation', 'Date émission', 
       'Point de vente', 'Code PV', 'Voyageur', 'Passeport', 'Nationalité',
       'Montant HT (CDF)', 'TVA (CDF)', 'Remboursement (CDF)', 'Articles'],
      ['───', '──────────────────', '────────────', '────────────────', '────────────────', '────────────────',
       '────────────────────', '──────────', '────────────────────────', '────────────', '───────────────',
       '─────────────────', '────────────', '─────────────────', '────────'],
    ];
    const formsRows = (report.forms_detail || []).map((f, idx) => {
      let statusIcon = '📄';
      if (f.status === 'VALIDATED') statusIcon = '✅';
      else if (f.status === 'ISSUED') statusIcon = '📤';
      else if (f.status === 'REFUNDED') statusIcon = '💵';
      else if (f.status === 'CANCELLED') statusIcon = '❌';
      else if (f.status === 'REFUSED') statusIcon = '🚫';
      else if (f.status === 'PENDING') statusIcon = '⏳';
      
      return [
        idx + 1,
        f.form_number,
        `${statusIcon} ${statusLabels[f.status] || f.status}`,
        f.created_at,
        f.validated_at || '-',
        f.issued_at || '-',
        f.outlet_name,
        f.outlet_code,
        f.traveler_name,
        f.traveler_passport,
        f.traveler_nationality,
        formatNumber(f.total_amount),
        formatNumber(f.tva_amount),
        formatNumber(f.refund_amount),
        f.items_count,
      ];
    });
    // Filter out cancelled forms for totals calculation
    const nonCancelledForms = (report.forms_detail || []).filter(f => f.status !== 'CANCELLED');
    const cancelledForms = (report.forms_detail || []).filter(f => f.status === 'CANCELLED');
    
    const formsTotals = [
      ['───', '──────────────────', '────────────', '────────────────', '────────────────', '────────────────',
       '────────────────────', '──────────', '────────────────────────', '────────────', '───────────────',
       '─────────────────', '────────────', '─────────────────', '────────'],
      ['', '📊 TOTAL (hors annulés)', '', '', '', '', '', '', '', '', '',
        formatNumber(nonCancelledForms.reduce((sum, f) => sum + f.total_amount, 0)),
        formatNumber(nonCancelledForms.reduce((sum, f) => sum + f.tva_amount, 0)),
        formatNumber(nonCancelledForms.reduce((sum, f) => sum + f.refund_amount, 0)),
        nonCancelledForms.reduce((sum, f) => sum + f.items_count, 0),
      ],
      ['', `❌ Annulés (${cancelledForms.length})`, '', '', '', '', '', '', '', '', '',
        formatNumber(cancelledForms.reduce((sum, f) => sum + f.total_amount, 0)),
        formatNumber(cancelledForms.reduce((sum, f) => sum + f.tva_amount, 0)),
        formatNumber(cancelledForms.reduce((sum, f) => sum + f.refund_amount, 0)),
        cancelledForms.reduce((sum, f) => sum + f.items_count, 0),
      ],
      ['═══', '══════════════════', '════════════', '════════════════', '════════════════', '════════════════',
       '════════════════════', '══════════', '════════════════════════', '════════════', '═══════════════',
       '═════════════════', '════════════', '═════════════════', '════════'],
    ];
    const wsForms = XLSX.utils.aoa_to_sheet([...formsHeaders, ...formsRows, ...formsTotals]);
    wsForms['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 22 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 17 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsForms, '📋 Bordereaux détaillés');

    // ========== FEUILLE 6: STATISTIQUES AVANCÉES ==========
    const avgPerOutlet = report.by_outlet.length > 0 
      ? Math.round(report.summary.total_forms / report.by_outlet.length) : 0;
    const avgPerNationality = report.by_nationality.length > 0 
      ? Math.round(report.summary.total_forms / report.by_nationality.length) : 0;
    const topOutlet = report.by_outlet.length > 0 
      ? report.by_outlet.reduce((max, o) => o.total_sales > max.total_sales ? o : max, report.by_outlet[0]) : null;
    const topNationality = report.by_nationality.length > 0 
      ? report.by_nationality.reduce((max, n) => n.total_amount > max.total_amount ? n : max, report.by_nationality[0]) : null;

    const statsData = [
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    📊 STATISTIQUES AVANCÉES'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  PERFORMANCES GLOBALES                                                       │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    📊 Nombre total de bordereaux', formatNumber(report.summary.total_forms)],
      ['    💰 Chiffre d\'affaires total', `${formatNumber(report.summary.total_sales)} CDF`],
      ['    🧾 TVA totale collectée', `${formatNumber(report.summary.total_refund)} CDF`],
      ['    📈 Montant moyen par bordereau', `${formatNumber(Math.round(report.summary.avg_amount))} CDF`],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  ANALYSE DES POINTS DE VENTE                                                 │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    🏪 Nombre de points de vente actifs', report.by_outlet.length],
      ['    📊 Moyenne de bordereaux par point de vente', avgPerOutlet],
      ['    🏆 Point de vente le plus performant', topOutlet ? `${topOutlet.name} (${formatNumber(topOutlet.total_sales)} CDF)` : '-'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  ANALYSE DES NATIONALITÉS                                                    │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    🌍 Nombre de nationalités différentes', report.by_nationality.length],
      ['    📊 Moyenne de bordereaux par nationalité', avgPerNationality],
      ['    🏆 Nationalité principale', topNationality ? `${topNationality.flag} ${topNationality.name} (${formatNumber(topNationality.total_amount)} CDF)` : '-'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  TAUX DE CONVERSION                                                          │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    ✅ Taux de validation', report.summary.total_forms > 0 ? ((report.summary.validated / report.summary.total_forms) * 100).toFixed(2) + '%' : '0%'],
      ['    💵 Taux de remboursement', report.summary.total_forms > 0 ? ((report.summary.refunded / report.summary.total_forms) * 100).toFixed(2) + '%' : '0%'],
      ['    ❌ Taux d\'annulation', report.summary.total_forms > 0 ? ((report.summary.cancelled / report.summary.total_forms) * 100).toFixed(2) + '%' : '0%'],
      ['    🚫 Taux de refus', report.summary.total_forms > 0 ? ((report.summary.refused / report.summary.total_forms) * 100).toFixed(2) + '%' : '0%'],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    wsStats['!cols'] = [{ wch: 45 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsStats, '📊 Statistiques');

    // ========== FEUILLE 7: MÉTHODOLOGIE ==========
    const methodoData = [
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['                    📖 MÉTHODOLOGIE ET NOTES'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['Ce rapport a été généré automatiquement par le système Tax Free RDC.'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  DÉFINITIONS                                                                 │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    📋 Bordereau', 'Document fiscal attestant d\'un achat éligible au remboursement de TVA'],
      ['    🧾 TVA collectée', 'Montant de TVA potentiellement remboursable aux voyageurs'],
      ['    📈 Taux de validation', 'Pourcentage de bordereaux validés par la douane'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  STATUTS DES BORDEREAUX                                                      │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    📄 Créé', 'Bordereau créé mais pas encore finalisé'],
      ['    📤 Émis', 'Bordereau émis et remis au voyageur'],
      ['    ⏳ En attente', 'En attente de validation douanière'],
      ['    ✅ Validé', 'Validé par la douane, éligible au remboursement'],
      ['    🚫 Refusé', 'Refusé par la douane'],
      ['    💵 Remboursé', 'TVA remboursée au voyageur'],
      ['    ❌ Annulé', 'Bordereau annulé'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  PÉRIODE ANALYSÉE                                                            │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    📅 Début', report.period.start_date || 'Depuis le début des opérations'],
      ['    📅 Fin', report.period.end_date || 'Jusqu\'à aujourd\'hui'],
      [''],
      ['┌─────────────────────────────────────────────────────────────────────────────┐'],
      ['│  INFORMATIONS TECHNIQUES                                                     │'],
      ['└─────────────────────────────────────────────────────────────────────────────┘'],
      [''],
      ['    🖥️ Date de génération', new Date().toLocaleString('fr-FR')],
      ['    ⚙️ Système', 'Tax Free RDC'],
      ['    📌 Version', '2.0'],
      [''],
      ['════════════════════════════════════════════════════════════════════════════════'],
      ['                    © Tax Free RDC - Tous droits réservés'],
      ['════════════════════════════════════════════════════════════════════════════════'],
    ];
    const wsMethodo = XLSX.utils.aoa_to_sheet(methodoData);
    wsMethodo['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsMethodo, '📖 Méthodologie');

    // Generate and download file
    XLSX.writeFile(wb, `rapport_taxfree_${report.merchant.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Generate DGI document
  const generateDGIDocument = () => {
    if (!report) return;

    let doc = `
═══════════════════════════════════════════════════════════════════
                    DOCUMENT OFFICIEL - DGI
              DÉCLARATION D'ACTIVITÉ TAX FREE
═══════════════════════════════════════════════════════════════════

INFORMATIONS COMMERÇANT
───────────────────────────────────────────────────────────────────
Raison sociale    : ${report.merchant.name}
Nom commercial    : ${report.merchant.trade_name || '-'}
Date du rapport   : ${new Date().toLocaleDateString('fr-FR')}
Période           : ${report.period.start_date || 'Depuis le début'} - ${report.period.end_date || "Aujourd'hui"}

SYNTHÈSE DE L'ACTIVITÉ
───────────────────────────────────────────────────────────────────
Nombre total de bordereaux émis    : ${report.summary.total_forms}
Montant total des ventes           : ${formatAmount(report.summary.total_sales)}
Montant total TVA collectée        : ${formatAmount(report.summary.total_refund)}
Montant moyen par bordereau        : ${formatAmount(report.summary.avg_amount)}

RÉPARTITION PAR STATUT
───────────────────────────────────────────────────────────────────
Bordereaux validés par la douane   : ${report.summary.validated}
Bordereaux en attente              : ${report.summary.pending}
Bordereaux remboursés              : ${report.summary.refunded}
Bordereaux annulés                 : ${report.summary.cancelled}
Bordereaux refusés                 : ${report.summary.refused}

DÉTAIL PAR POINT DE VENTE
───────────────────────────────────────────────────────────────────
`;
    report.by_outlet.forEach(o => {
      doc += `
${o.name} (${o.code})
  - Bordereaux : ${o.forms_count}
  - Ventes     : ${formatAmount(o.total_sales)}
  - TVA        : ${formatAmount(o.total_refund)}
`;
    });

    doc += `
RÉPARTITION PAR NATIONALITÉ DES VOYAGEURS
───────────────────────────────────────────────────────────────────
`;
    report.by_nationality.forEach(n => {
      doc += `${n.flag} ${n.name.padEnd(20)} : ${n.count} bordereaux (${formatAmount(n.total_amount)})\n`;
    });

    doc += `
ÉVOLUTION MENSUELLE
───────────────────────────────────────────────────────────────────
`;
    report.by_month.forEach(m => {
      doc += `${m.month_label.padEnd(15)} : ${m.forms_count} bordereaux | ${formatShortAmount(m.total_sales)} ventes | ${m.validation_rate}% validés\n`;
    });

    doc += `
═══════════════════════════════════════════════════════════════════
Document généré automatiquement par Tax Free RDC
Date de génération : ${new Date().toLocaleString('fr-FR')}
═══════════════════════════════════════════════════════════════════
`;

    // Download
    const blob = new Blob([doc], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `declaration_dgi_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rapports consolidés et exports pour la DGI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            disabled={!report}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Export Excel
          </button>
          <button
            onClick={generateDGIDocument}
            disabled={!report}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Document DGI
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Période :</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Bordereaux</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{report.summary.total_forms}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-500">Total ventes</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatShortAmount(report.summary.total_sales)}</p>
              <p className="text-xs text-gray-400">CDF</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">TVA collectée</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatShortAmount(report.summary.total_refund)}</p>
              <p className="text-xs text-gray-400">CDF</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-gray-500">Montant moyen</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatShortAmount(report.summary.avg_amount)}</p>
              <p className="text-xs text-gray-400">CDF</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-12 gap-6">
            {/* Monthly Evolution */}
            <div className="col-span-8 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Évolution mensuelle</h3>
              <div className="h-64">
                <Bar
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                    },
                    scales: {
                      x: { grid: { display: false } },
                      y: { 
                        grid: { color: 'rgba(243, 244, 246, 1)' },
                        ticks: {
                          callback: (value: any) => formatShortAmount(value)
                        }
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Status Distribution */}
            <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Répartition par statut</h3>
              <div className="h-48">
                <Doughnut
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' as const, labels: { boxWidth: 12 } },
                    },
                    cutout: '60%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-12 gap-6">
            {/* By Outlet */}
            <div className="col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900">Par point de vente</h3>
              </div>
              <div className="space-y-3">
                {report.by_outlet.map((outlet) => (
                  <div key={outlet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{outlet.name}</p>
                      <p className="text-xs text-gray-500">{outlet.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{outlet.forms_count} bordereaux</p>
                      <p className="text-xs text-emerald-600">{formatShortAmount(outlet.total_refund)} TVA</p>
                    </div>
                  </div>
                ))}
                {report.by_outlet.length === 0 && (
                  <p className="text-center text-gray-400 py-4">Aucune donnée</p>
                )}
              </div>
            </div>

            {/* By Nationality */}
            <div className="col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900">Par nationalité</h3>
              </div>
              <div className="space-y-3">
                {report.by_nationality.map((nat) => (
                  <div key={nat.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{nat.flag}</span>
                      <p className="font-medium text-gray-900">{nat.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{nat.count} bordereaux</p>
                      <p className="text-xs text-gray-500">{formatShortAmount(nat.total_amount)} CDF</p>
                    </div>
                  </div>
                ))}
                {report.by_nationality.length === 0 && (
                  <p className="text-center text-gray-400 py-4">Aucune donnée</p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Détail mensuel</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bordereaux</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Validés</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.by_month.map((month) => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{month.month_label}</td>
                      <td className="px-4 py-3 text-center">{month.forms_count}</td>
                      <td className="px-4 py-3 text-right">{formatAmount(month.total_sales)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatAmount(month.total_refund)}</td>
                      <td className="px-4 py-3 text-center">{month.validated}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          month.validation_rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          month.validation_rate >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {month.validation_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune donnée disponible</p>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
