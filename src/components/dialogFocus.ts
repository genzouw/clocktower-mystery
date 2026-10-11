/**
 * Tab の折り返しの対象にする要素。
 * tabindex="-1" の要素（切り替えで選ばれていないタブなど）は Tab で止まらないため、
 * 種類によらず除く。含めると端の要素の判定がずれ、Tab がダイアログの外へ出る。
 */
export const FOCUSABLE = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]',
]
  .map((s) => (s.includes(':not([tabindex') ? s : `${s}:not([tabindex="-1"])`))
  .join(', ')
