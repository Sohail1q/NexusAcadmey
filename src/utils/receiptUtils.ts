import { NexusStudent, NexusClass, ReceiptData } from '../types';
import { getPeshawarComponents } from './peshawarTime';

/**
 * Generate unique receipt number composed of exactly two letters and 5 digits
 * Example: NA10482 or NA74920
 */
export function generateReceiptNumber(seed?: string | number): string {
  const letters = 'NA';
  let numPart = '';

  if (seed !== undefined && seed !== null) {
    const digitsOnly = String(seed).replace(/\D/g, '');
    if (digitsOnly.length >= 5) {
      numPart = digitsOnly.slice(-5);
    } else if (digitsOnly.length > 0) {
      numPart = digitsOnly.padStart(5, '0');
    }
  }

  if (!numPart || numPart.length !== 5) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    numPart = String(rand);
  }

  return `${letters}${numPart}`;
}

export const MONTHS_ORDER = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface CycleMonthRow {
  monthName: string;
  displayMonthYear: string;
  year: number;
  className: string;
  demanded: number;
  paid: number;
  dues: number;
  date: string;
  status?: string;
  isBeforeAdmission?: boolean;
  isFuture?: boolean;
}

export interface FeeCycleResult {
  rows: CycleMonthRow[];
  academicYearStr: string;
  previousYearDues: number;
  currentYearDemanded: number;
  currentYearPaid: number;
  currentYearDues: number;
  cyclePeriod: string;
}

/**
 * Build the Academic Fee Ledger for a student with dynamic calendar month progression:
 * - Cycle starts after September (September–December session):
 *   Shows months from September onwards. In September: September is shown.
 *   In October: September, October. In November: Sep, Oct, Nov. In December: Sep, Oct, Nov, Dec.
 *   All past months prior to September have their remaining unpaid balances added into "Previous Dues / Brought Forward".
 * - In January, the new cycle begins:
 *   All past month dues (from September to December and prior) are added into "Previous Dues / Brought Forward".
 *   January starts at the top. In February: January is at top, February is under it.
 *   Progresses through the year.
 * - Dates and current months are strictly identified using Pakistan (Peshawar) standard time.
 */
export function generateStudentFeeCycle(
  student?: NexusStudent | null,
  activeClass?: NexusClass | null,
  currentYear?: number,
  receipt?: ReceiptData | null
): FeeCycleResult {
  // Use Pakistan / Peshawar standard time for identifying current year and month
  const pkt = getPeshawarComponents();
  const systemYear = pkt.year;
  const systemMonthIdx = pkt.monthIndex; // 0 = Jan, 8 = Sep, 11 = Dec

  // Determine admission date if present
  const admDateStr =
    receipt?.admissionDate ||
    student?.admissionDate ||
    student?.registeredAt ||
    student?.lastAdmissionDate ||
    '';

  let hasAdmDate = false;
  let admYear = systemYear;
  let admMonth = 0; // default Jan

  if (admDateStr) {
    const parsed = new Date(admDateStr);
    if (!isNaN(parsed.getTime())) {
      hasAdmDate = true;
      const admPkt = getPeshawarComponents(parsed);
      admYear = admPkt.year;
      admMonth = admPkt.monthIndex;
    }
  }

  // Base academic year for the receipt
  let baseYear = currentYear || systemYear;
  let activeMonthIdx = systemMonthIdx;

  if (receipt?.targetMonth) {
    const tLower = receipt.targetMonth.toLowerCase();
    const foundIdx = MONTHS_ORDER.findIndex((m) => tLower.includes(m.toLowerCase()));
    if (foundIdx !== -1) {
      activeMonthIdx = foundIdx;
    }
  } else if (receipt?.date) {
    const parsedDate = new Date(receipt.date);
    if (!isNaN(parsedDate.getTime())) {
      const receiptPkt = getPeshawarComponents(parsedDate);
      baseYear = currentYear || receiptPkt.year;
      if (baseYear === receiptPkt.year) {
        activeMonthIdx = receiptPkt.monthIndex;
      }
    }
  }

  // Determine cycle start and end based on user specification:
  // "keep the histroy of all students after the septmber and in jnuaray all the past month dues will be added in it and the same cycle will start"
  let cycleStartIdx = 0;
  let cycleEndIdx = 11;
  let cyclePeriod = '';

  if (activeMonthIdx >= 8) {
    // September (8) to December (11) cycle
    cycleStartIdx = 8;
    cycleEndIdx = baseYear < systemYear ? 11 : Math.min(11, activeMonthIdx);
    cyclePeriod = `Session ${baseYear} (Sep–Dec)`;
  } else {
    // January (0) to August (7) cycle
    cycleStartIdx = 0;
    cycleEndIdx = baseYear < systemYear ? 7 : Math.min(7, activeMonthIdx);
    cyclePeriod = `Session ${baseYear} (Jan–Aug)`;
  }

  const academicYearStr = cyclePeriod;

  // Net monthly fee calculation: prioritize current student record so that any fee edit
  // immediately propagates to all generated fee cycle ledgers and receipts
  const mFee =
    student?.monthlyFee !== undefined
      ? student.monthlyFee
      : (receipt?.monthlyFee !== undefined ? receipt.monthlyFee : 0);
  const mDisc =
    student?.monthlyDiscount !== undefined
      ? student.monthlyDiscount
      : (receipt?.monthlyDiscount !== undefined ? receipt.monthlyDiscount : 0);
  const monthlyFeeNet = Math.max(0, mFee - mDisc);

  // Active class name
  const className =
    activeClass?.className ||
    receipt?.className ||
    student?.className ||
    'General';

  // Overall student balances
  const studentOverallDues =
    student?.dues !== undefined
      ? student.dues
      : (receipt?.remainingDues !== undefined ? receipt.remainingDues : 0);

  const rows: CycleMonthRow[] = [];
  let currentYearDemanded = 0;
  let currentYearPaid = 0;
  let currentYearDues = 0;

  // Calculate prior months unpaid dues (from months before cycleStartIdx)
  let priorMonthsUnpaidDues = 0;
  for (let p = 0; p < cycleStartIdx; p++) {
    const mName = MONTHS_ORDER[p];
    const hist = student?.monthlyHistory?.[mName] || student?.monthlyHistory?.[`${mName} ${baseYear}`];
    if (hist) {
      const demanded = hist.fee || 0;
      const paid = hist.paid || 0;
      if (demanded > paid) {
        priorMonthsUnpaidDues += (demanded - paid);
      }
    }
  }

  // Loop through active cycle months
  for (let i = cycleStartIdx; i <= cycleEndIdx; i++) {
    const monthName = MONTHS_ORDER[i];
    const displayMonthYear = `${monthName} ${baseYear}`;

    // 1. Is this month strictly BEFORE admission in baseYear?
    const isBeforeAdmission =
      hasAdmDate && (baseYear < admYear || (baseYear === admYear && i < admMonth));

    // Check history / payments / backlog
    const histEntry =
      student?.monthlyHistory?.[monthName] ||
      student?.monthlyHistory?.[displayMonthYear];
    const mbEntry = (receipt?.monthsBreakdown || []).find((mb) =>
      (mb.month || '').toLowerCase().includes(monthName.toLowerCase())
    );

    const hasExplicitBacklog =
      (histEntry && histEntry.fee && histEntry.fee > 0) ||
      (mbEntry &&
        mbEntry.duesDemanded &&
        mbEntry.duesDemanded > 0 &&
        mbEntry.status === 'Added to Dues');

    // Hide past un-enrolled months if student had 0 demanded and 0 backlog
    if (isBeforeAdmission && !hasExplicitBacklog) {
      continue;
    }

    let demanded = monthlyFeeNet;
    let paid = 0;
    let datePaid = '';

    if (isBeforeAdmission && hasExplicitBacklog) {
      demanded = histEntry?.fee || mbEntry?.duesDemanded || 0;
      paid = histEntry?.paid || mbEntry?.amountSubmitted || 0;
      datePaid = histEntry?.paidDate || mbEntry?.submissionDate || '';
    } else {
      // Normal active month
      paid = histEntry?.paid || 0;
      datePaid = histEntry?.paidDate || '';

      // Check payments in student.feePayments
      const matchingPayments = (student?.feePayments || []).filter((p) =>
        (p.month || '').toLowerCase().includes(monthName.toLowerCase())
      );
      const paymentsSum = matchingPayments.reduce(
        (acc, p) => acc + (Number(p.amount) || 0),
        0
      );
      if (paymentsSum > 0) {
        paid = Math.max(paid, paymentsSum);
        datePaid = datePaid || matchingPayments[matchingPayments.length - 1].date || '';
      }

      // Check receipt breakdown if present
      if (mbEntry && (mbEntry.amountSubmitted || 0) > 0) {
        paid = Math.max(paid, mbEntry.amountSubmitted || 0);
        datePaid = datePaid || mbEntry.submissionDate || '';
      }

      // Check target month on receipt
      if (
        (receipt?.targetMonth || '').toLowerCase().includes(monthName.toLowerCase())
      ) {
        if ((receipt?.paidAmount || 0) > 0) {
          paid = Math.max(paid, receipt.paidAmount || 0);
          datePaid = datePaid || receipt?.date || '';
        }
      }

      // Admission month
      const isAdmissionMonth = hasAdmDate && baseYear === admYear && i === admMonth;
      if (isAdmissionMonth) {
        if (studentOverallDues === 0 && demanded > 0) {
          paid = Math.max(paid, demanded);
          datePaid = datePaid || receipt?.date || admDateStr || '';
        } else if (paid === 0 && (receipt?.paidAmount || 0) > 0) {
          paid = Math.min(demanded, receipt?.paidAmount || 0);
          datePaid = datePaid || receipt?.date || admDateStr || '';
        }
      }
    }

    // If overall student dues are completely cleared in the system
    if (studentOverallDues === 0 && demanded > 0) {
      paid = Math.max(paid, demanded);
      datePaid = datePaid || receipt?.date || 'Paid';
    }

    const dues = Math.max(0, demanded - paid);
    let dateLabel = '-';
    let status = 'Cleared';

    if (dues === 0 && demanded > 0) {
      paid = Math.max(paid, demanded);
      dateLabel = datePaid || receipt?.date || 'Paid';
      status = 'Paid';
    } else if (paid > 0 && dues > 0) {
      dateLabel = datePaid ? `${datePaid} (Bal ${dues})` : `Partial (Bal ${dues})`;
      status = 'Partial';
    } else if (demanded > 0 && paid === 0) {
      dateLabel = 'Pending';
      status = 'Pending';
    }

    currentYearDemanded += demanded;
    currentYearPaid += paid;
    currentYearDues += dues;

    rows.push({
      monthName,
      displayMonthYear,
      year: baseYear,
      className,
      demanded,
      paid,
      dues,
      date: dateLabel,
      status,
      isBeforeAdmission,
    });
  }

  // Check if upcoming future months in this cycle have advance payment recorded
  const cycleLimit = cycleStartIdx === 8 ? 12 : 8;
  for (let i = cycleEndIdx + 1; i < cycleLimit; i++) {
    const monthName = MONTHS_ORDER[i];
    const displayMonthYear = `${monthName} ${baseYear}`;
    const histEntry =
      student?.monthlyHistory?.[monthName] ||
      student?.monthlyHistory?.[displayMonthYear];
    const mbEntry = (receipt?.monthsBreakdown || []).find((mb) =>
      (mb.month || '').toLowerCase().includes(monthName.toLowerCase())
    );
    const isTarget = (receipt?.targetMonth || '')
      .toLowerCase()
      .includes(monthName.toLowerCase());
    const advancePaid =
      (histEntry?.paid || 0) ||
      (mbEntry?.amountSubmitted || 0) ||
      (isTarget ? (receipt?.paidAmount || 0) : 0);

    if (advancePaid > 0) {
      const demanded = monthlyFeeNet;
      const dues = Math.max(0, demanded - advancePaid);
      const datePaid = histEntry?.paidDate || mbEntry?.submissionDate || receipt?.date || 'Advance Paid';

      currentYearDemanded += demanded;
      currentYearPaid += advancePaid;
      currentYearDues += dues;

      rows.push({
        monthName,
        displayMonthYear,
        year: baseYear,
        className,
        demanded,
        paid: advancePaid,
        dues,
        date: dues === 0 ? (datePaid || 'Advance Paid') : `${datePaid} (Bal ${dues})`,
        status: dues === 0 ? 'Advance Paid' : 'Partial Advance',
        isFuture: true,
      });
    }
  }

  // Calculate previous session / past month unpaid dues:
  // All dues from before this cycle (e.g. before September, or before January) are added into Previous Dues
  let previousYearDues = 0;
  if (receipt?.prevDues !== undefined && receipt.prevDues > 0) {
    previousYearDues = receipt.prevDues;
  } else if (studentOverallDues > currentYearDues) {
    previousYearDues = Math.max(0, studentOverallDues - currentYearDues);
  } else if (priorMonthsUnpaidDues > 0) {
    previousYearDues = priorMonthsUnpaidDues;
  } else if (hasAdmDate && admYear < baseYear && studentOverallDues > 0) {
    previousYearDues = studentOverallDues;
  }

  return {
    rows,
    academicYearStr,
    previousYearDues,
    currentYearDemanded,
    currentYearPaid,
    currentYearDues,
    cyclePeriod,
  };
}
