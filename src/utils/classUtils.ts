import { NexusClass, NexusStudent } from '../types';

/**
 * Standard class display string across legacy views, dropdowns, and exports.
 */
export const formatClassString = (c: NexusClass): string => {
  if (!c) return '';
  return `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})`;
};

/**
 * Official Demanded Format required for Receipts and Student Records:
 * (name of teacher / class category / timing)
 * e.g. (Sir Bilal / English Language - Basic English / 03:00 PM to 04:00 PM)
 */
export const formatSingleClassDemanded = (c: NexusClass): string => {
  if (!c) return '';
  const teacher = (c.teacher || 'Teacher').trim();
  const time = c.startTime && c.endTime ? `${c.startTime} to ${c.endTime}` : (c.startTime || c.endTime || 'Flexible');
  const cat = c.category && c.category.trim() && c.category.trim().toLowerCase() !== c.className.trim().toLowerCase()
    ? `${c.category.trim()} - ${c.className.trim()}`
    : c.className.trim();
  return `(${teacher} / ${cat} / ${time})`;
};

/**
 * Formats multiple classes combined with " + " exactly as demanded:
 * (name of teacher/class gatogrey/timing) + (name of teacher /gatogrey /timing)
 */
export const formatDualClassesString = (c1: NexusClass | undefined | null, c2: NexusClass | undefined | null): string => {
  if (!c1 && !c2) return '';
  if (c1 && !c2) return formatSingleClassDemanded(c1);
  if (!c1 && c2) return formatSingleClassDemanded(c2);
  return `${formatSingleClassDemanded(c1!)} + ${formatSingleClassDemanded(c2!)}`;
};

/**
 * Splits a combined multi-class string like:
 * "(Teacher 1 / Cat 1 / Time 1) + (Teacher 2 / Cat 2 / Time 2)"
 * into individual class segment strings.
 */
export const splitClassSegments = (classStr?: string | null): string[] => {
  if (!classStr || !classStr.trim()) return [];
  const str = classStr.trim();
  if (str.includes(' + ')) {
    return str.split(' + ').map((s) => s.trim()).filter(Boolean);
  }
  return [str];
};

/**
 * Matches a class segment string back to a NexusClass from the registered classes list.
 */
export const matchClassFromSegment = (segment: string, classes: NexusClass[]): NexusClass | undefined => {
  if (!segment || !segment.trim() || !classes || classes.length === 0) return undefined;
  const cleanSeg = segment.trim().toLowerCase();

  return classes.find((c) => {
    const fullDemanded = formatSingleClassDemanded(c).toLowerCase().trim();
    const fullStd = formatClassString(c).toLowerCase().trim();
    const pureName = c.className.trim().toLowerCase();
    const teacher = (c.teacher || '').trim().toLowerCase();

    if (cleanSeg === fullDemanded || cleanSeg === fullStd) return true;
    if (cleanSeg === pureName) return true;
    if (cleanSeg.includes(pureName) && cleanSeg.includes(teacher)) return true;
    if (c.startTime && c.endTime) {
      const timeFmt1 = `(${c.startTime} to ${c.endTime})`.toLowerCase();
      const timeFmt2 = `${c.startTime} to ${c.endTime}`.toLowerCase();
      if (cleanSeg.includes(pureName) && (cleanSeg.includes(timeFmt1) || cleanSeg.includes(timeFmt2))) {
        if (!teacher || cleanSeg.includes(teacher)) return true;
      }
    }
    return false;
  });
};

/**
 * Parses all classes assigned to a student (supporting 1, 2, or more classes).
 */
export const parseStudentClasses = (classStr: string | undefined | null, classes: NexusClass[]): NexusClass[] => {
  const segments = splitClassSegments(classStr);
  const matched: NexusClass[] = [];
  segments.forEach((seg) => {
    const found = matchClassFromSegment(seg, classes);
    if (found && !matched.some((m) => m.className === found.className && m.teacher === found.teacher && m.startTime === found.startTime)) {
      matched.push(found);
    }
  });
  return matched;
};

/**
 * Determines whether a student is enrolled in a specific class,
 * accurately handling dual/multiple class enrollment.
 */
export const isStudentEnrolledInClass = (studentClassStr: string | undefined | null, targetClassStr: string): boolean => {
  if (!studentClassStr || !targetClassStr) return false;
  if (studentClassStr === targetClassStr) return true;
  const segments = splitClassSegments(studentClassStr);
  return segments.some((seg) => {
    if (seg === targetClassStr) return true;
    const cleanSeg = seg.toLowerCase().replace(/[()]/g, '');
    const cleanTarget = targetClassStr.toLowerCase().replace(/[()]/g, '');
    return cleanSeg.includes(cleanTarget) || cleanTarget.includes(cleanSeg);
  });
};

/**
 * Validates if a student's assigned class (or any of their dual classes) matches an active class.
 */
export const isClassActive = (
  className: string | undefined | null,
  classes: NexusClass[]
): boolean => {
  if (!className || !className.trim() || !classes || classes.length === 0) {
    return false;
  }

  const cleanTarget = className.trim().toLowerCase();

  // Explicit non-assigned indicators
  if (
    cleanTarget === 'unassigned' ||
    cleanTarget === 'not assigned' ||
    cleanTarget === 'n/a' ||
    cleanTarget === 'none' ||
    cleanTarget === 'general tuition'
  ) {
    return false;
  }

  // Handle multi-class joined with ' + '
  if (className.includes(' + ')) {
    const parts = splitClassSegments(className);
    return parts.some((p) => isClassActive(p, classes));
  }

  return classes.some((c) => {
    if (!c || !c.className) return false;
    const fullDemanded = formatSingleClassDemanded(c).toLowerCase().trim();
    const fullFmt = formatClassString(c).toLowerCase().trim();
    const shortFmt = `${c.category} - ${c.className}`.toLowerCase().trim();
    const pureName = c.className.trim().toLowerCase();
    const teacherName = (c.teacher || '').trim().toLowerCase();

    // 1. Exact match with demanded format
    if (cleanTarget === fullDemanded) return true;

    // 2. Exact match with the full standard format
    if (cleanTarget === fullFmt) return true;

    // 3. Exact match with category - class name
    if (cleanTarget === shortFmt) return true;

    // 4. Exact match with pure class name
    if (cleanTarget === pureName) return true;

    // 5. Exact match with teacher & class name combinations
    if (
      cleanTarget === `${teacherName} | ${pureName}` ||
      cleanTarget === `${teacherName} - ${pureName}` ||
      cleanTarget === `${teacherName}: ${pureName}` ||
      cleanTarget === `${teacherName} | ${shortFmt}`
    ) {
      return true;
    }

    // 6. If timing is present, both pureName and time range must match this exact class
    if (c.startTime && c.endTime) {
      const timeFmt1 = `(${c.startTime} to ${c.endTime})`.toLowerCase();
      const timeFmt2 = `${c.startTime} to ${c.endTime}`.toLowerCase();
      if (cleanTarget.includes(pureName) && (cleanTarget.includes(timeFmt1) || cleanTarget.includes(timeFmt2))) {
        if (!teacherName || cleanTarget.includes(teacherName)) {
          return true;
        }
      }
    }

    return false;
  });
};

/**
 * Returns the active class string for a student, or 'Not Assigned' if empty or deleted.
 * For dual classes, returns only the active class components joined by ' + '.
 */
export const getActiveStudentClassDisplay = (
  className: string | undefined | null,
  classes: NexusClass[]
): string => {
  if (!className || !className.trim()) return 'Not Assigned';

  if (className.includes(' + ')) {
    const parts = splitClassSegments(className);
    const activeParts = parts.filter((p) => isClassActive(p, classes));
    if (activeParts.length > 0) {
      return activeParts.join(' + ');
    }
    return 'Not Assigned';
  }

  if (isClassActive(className, classes)) {
    return className.trim();
  }
  return 'Not Assigned';
};

/**
 * Filters and sanitizes student array after a class has been deleted.
 * Cleans up any student assigned to the deleted class or with an invalid/deleted class name.
 * For dual-class students, removes the deleted class and preserves the remaining active class,
 * automatically updating monthlyFee and admissionFee to match remaining classes.
 */
export const sanitizeStudentsAfterClassDeletion = (
  students: NexusStudent[],
  deletedClass: NexusClass | undefined,
  remainingClasses: NexusClass[]
): NexusStudent[] => {
  return students.map((s) => {
    if (!s.className || !s.className.trim()) {
      return {
        ...s,
        className: '',
        monthlyFee: 0,
        admissionFee: 0,
      };
    }

    // If student has multiple classes joined by ' + '
    if (s.className.includes(' + ')) {
      const segments = splitClassSegments(s.className);
      const remainingSegments = segments.filter((seg) => {
        if (deletedClass) {
          const matched = matchClassFromSegment(seg, [deletedClass]);
          if (matched) return false;
        }
        return isClassActive(seg, remainingClasses);
      });

      if (remainingSegments.length === 0) {
        return {
          ...s,
          className: '',
          monthlyFee: 0,
          admissionFee: 0,
        };
      }

      // Re-sum fees for remaining active classes
      const matchedClasses = remainingSegments
        .map((seg) => matchClassFromSegment(seg, remainingClasses))
        .filter(Boolean) as NexusClass[];

      const sumMonthly = matchedClasses.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
      const sumAdmission = matchedClasses.reduce((acc, c) => acc + (c.admissionFee || 0), 0);

      return {
        ...s,
        className: remainingSegments.join(' + '),
        monthlyFee: sumMonthly || (matchedClasses.length > 0 ? sumMonthly : s.monthlyFee || 0),
        admissionFee: sumAdmission || 0,
      };
    }

    // Single class check
    if (deletedClass) {
      const fullDeleted = formatClassString(deletedClass).toLowerCase().trim();
      const demandedDeleted = formatSingleClassDemanded(deletedClass).toLowerCase().trim();
      const pureDeleted = deletedClass.className.trim().toLowerCase();
      const sClass = s.className.trim().toLowerCase();

      if (
        sClass === fullDeleted ||
        sClass === demandedDeleted ||
        sClass === pureDeleted ||
        sClass.includes(pureDeleted)
      ) {
        return {
          ...s,
          className: '',
          monthlyFee: 0,
          admissionFee: 0,
        };
      }
    }

    // Or if it is simply no longer active in remaining classes
    const isStillActive = isClassActive(s.className, remainingClasses);
    if (!isStillActive) {
      return {
        ...s,
        className: '',
        monthlyFee: 0,
        admissionFee: 0,
      };
    }

    return s;
  });
};

/**
 * Sanitizes all students in state against the active classes list.
 * Any student referencing a non-existent or deleted class will have their className cleared to '' and fees reset.
 */
export const sanitizeAllStudentsClasses = (
  students: NexusStudent[],
  classes: NexusClass[]
): NexusStudent[] => {
  return students.map((s) => {
    if (!s.className || !s.className.trim()) {
      if ((s.monthlyFee || 0) > 0 || (s.admissionFee || 0) > 0) {
        return { ...s, monthlyFee: 0, admissionFee: 0 };
      }
      return s;
    }
    if (!isClassActive(s.className, classes)) {
      return {
        ...s,
        className: '',
        monthlyFee: 0,
        admissionFee: 0,
      };
    }
    return s;
  });
};
