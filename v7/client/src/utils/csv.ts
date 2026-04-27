export const escapeCsv = (str: any): string => {
  return str == null ? '""' : '"' + String(str).replace(/"/g, '""') + '"';
};
