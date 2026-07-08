export function PhaseTwoNotice({ feature, screenId }: { feature: string; screenId: string }) {
  return (
    <div className="card border-dashed">
      <p className="text-sm text-slate-500">
        {feature}（{screenId}）はフェーズ2で実装予定です。ルーティング・画面の枠組みのみ用意しています。詳細仕様は
        <code className="mx-1 rounded bg-slate-100 px-1">docs/design/detailed-design.md</code>
        を参照してください。
      </p>
    </div>
  );
}
