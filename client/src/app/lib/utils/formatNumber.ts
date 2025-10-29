import numeral from 'numeral';

export function fCurrency(number: string | number) {
  return numeral(number).format(Number.isInteger(number) ? '$0,0' : '$0,0.00');
}

export function fPercent(number: number) {
  return numeral(number / 100).format('0.0%');
}

export function fPercent2(number: number) {
  return numeral(number / 100).format('0.00%');
}

export function fNumber(number: string | number) {
  return numeral(number).format();
}

export function fNumber2(number: string | number) {
  return numeral(number).format('0.00');
}

export function fNumber1(number: string | number) {
  return numeral(number).format('0.0');
}

export function fNumberTime(number: string | number) {
  return numeral(number).format('00');
}

export function fShortenNumber(number: string | number) {
  return numeral(number).format('0.00a').replace('.00', '');
}

export function fData(number: string | number) {
  return numeral(number).format('0.0 b');
}

export function fCode(number: string | number, prefix: string) {
  return `${prefix}${numeral(number).format('00000')}`;
}

export const fSeconds = (secs: number) => {
  const pad = (n: number) => (n < 10 ? `0${n}` : n);

  const h = Math.floor(secs / 3600);
  const m = Math.floor(secs / 60) - h * 60;
  const s = Math.floor(secs - h * 3600 - m * 60);

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const formatDateByReportType = (value: string, reportType: string): string => {
  if (!value) return '-';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (reportType) {
    case 'yearly':
      return `${date.getFullYear()}`;
    case 'monthly':
      return `${months[date.getMonth()]}-${date.getFullYear()}`;
    default: {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
};
