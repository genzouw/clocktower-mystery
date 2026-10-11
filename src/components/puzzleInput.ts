/** Enter を押したとき、ボタンの押下（クリック）に任せる要素の種類 */
export type FocusKind = 'keypad' | 'dialog-close' | 'other'

/**
 * フォーカスのある要素の種類を返す。
 * - keypad: 数字錠の画面キー（Enter はそのキー自身の操作）
 * - dialog-close: ダイアログの × ボタン（Enter は閉じる操作）
 * - other: 上記以外（ヒントのボタン、何もない場所など）
 */
export function focusKindOf(el: Element | null): FocusKind {
  if (el?.closest('.pz-keypad')) return 'keypad'
  if (el?.closest('.dialog-close')) return 'dialog-close'
  return 'other'
}

/**
 * 数字錠で Enter を回答の送信として扱うかを決める。
 * - 桁がそろっているときは、ヒントのボタンなどにフォーカスがあっても送信を優先する
 *   （そのまま押下に任せると、答えを送らずに次のヒントが開いてしまう）
 * - 画面キーと × にフォーカスがあるときは、そのボタン自身の操作に任せる
 * - 桁がそろっていないときは何もしない（ヒントのボタンは Enter で開ける）
 */
export function shouldSubmitOnEnter(
  inputLength: number,
  codeLength: number,
  focus: FocusKind,
): boolean {
  return inputLength === codeLength && focus === 'other'
}

/**
 * 背景のクリックでダイアログを閉じるかを決める。
 * 押下と離した位置の両方が背景のときだけ閉じる。パネル内で押して背景で離した
 * （入力欄の文字選択のドラッグなど）ときは閉じない。
 * pressTarget が null（押下を観測していない）のときは、クリックの位置だけで判定する。
 */
export function shouldCloseOnBackdropClick(
  pressTarget: EventTarget | null,
  clickTarget: EventTarget | null,
  backdrop: EventTarget | null,
): boolean {
  if (clickTarget !== backdrop) return false
  return pressTarget === null || pressTarget === backdrop
}
