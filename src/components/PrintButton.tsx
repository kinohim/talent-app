"use client";

/**
 * REF005 印刷用プレビューの「印刷」ボタン。ADR 0009: サーバーサイドPDF生成は採用せず、
 * ブラウザの印刷機能（Ctrl+P→PDFに保存）でPDF出力を実現する。ボタン自体は印刷時に非表示にする。
 */
export function PrintButton() {
  return (
    <button type="button" className="btn-primary no-print" onClick={() => window.print()}>
      印刷する（PDFに保存）
    </button>
  );
}
