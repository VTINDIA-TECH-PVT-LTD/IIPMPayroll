/**
 * Standard utility for IIPE employee name formatting.
 * Academic staff (Faculty, Teaching, Professors, etc.) are prefixed with "Dr. "
 * Non-Academic staff (Administration, Finance, Lab Assistant, etc.) are prefixed with "Mr. "
 */
export const formatEmployeeNameWithTitle = (empOrPayroll: any, userObj?: any): string => {
  if (!empOrPayroll && !userObj) return '';
  const src = userObj || empOrPayroll;
  const rawFirst = src.firstName || empOrPayroll?.firstName || '';
  const rawLast = src.lastName || empOrPayroll?.lastName || '';
  let rawName = `${rawFirst} ${rawLast}`.trim();
  if (!rawName) rawName = empOrPayroll?.employeeName || src.name || empOrPayroll?.name || '';
  if (!rawName) return empOrPayroll?.employeeId || src.employeeId || '-';

  const eid = (empOrPayroll?.employeeId || src.employeeId || '').toUpperCase().trim();
  const et = (src.employeeType || empOrPayroll?.employeeType || src.staffFunction || empOrPayroll?.staffFunction || src.function || '').toUpperCase();
  const desig = (src.designation || empOrPayroll?.designation || '').toUpperCase();
  const dept = (src.department || empOrPayroll?.department || '').toUpperCase();

  const isAcademic = 
    eid.startsWith('TS') ||
    (eid.startsWith('CT') && !eid.startsWith('CNT')) ||
    desig.includes('PROFESSOR') ||
    desig.includes('FACULTY') ||
    desig.includes('LECTURER') ||
    dept.includes('ENGINEERING') ||
    dept.includes('SCIENCES') ||
    dept === 'FACULTY' ||
    dept === 'ACADEMIC' ||
    et.includes('TEACHING');

  // Strip existing prefix if present to normalize
  let cleanName = rawName.replace(/^(dr\.?|prof\.?|professor|mr\.?|shri\.?|ms\.?|mrs\.?|smt\.?)\s+/i, '').trim();

  const prefix = isAcademic ? 'Dr. ' : 'Mr. ';
  return `${prefix}${cleanName}`;
};
