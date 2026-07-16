"use client";

import { useState } from "react";
import styles from "./SkillDashboard.module.css";
import {
  certCategories,
  skillTabs,
  skillBars,
  heatColumns,
  heatRows,
  riskItems,
  summaryStats,
  type CertCategoryKey,
} from "./data";

/**
 * スキルマップ／組織ダッシュボード
 *
 * 元デザイン(dashboard_mockup.html)をNext.js/React用に移植したコンポーネントです。
 * データは data.ts にまとめてあるので、実データ連携時はそこをAPI取得に置き換えてください。
 * Excel出力ボタンは現状プレースホルダーです(onExport* props で実処理を差し込めます)。
 */

export interface SkillDashboardProps {
  /** 「資格別保有者数」パネルのExcel出力ボタン押下時に呼ばれます */
  onExportCerts?: () => void;
  /** 「属人化リスク」パネルのExcel出力ボタン押下時に呼ばれます */
  onExportRisk?: () => void;
}

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const heatLevelClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: styles.h0,
  1: styles.h1,
  2: styles.h2,
  3: styles.h3,
  4: styles.h4,
};

export default function SkillDashboard({
  onExportCerts,
  onExportRisk,
}: SkillDashboardProps) {
  const [activeCert, setActiveCert] = useState<CertCategoryKey>("national");
  const [activeSkillTab, setActiveSkillTab] = useState(0); // 現状は見た目の切替のみ(元デザインと同じ)
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [openSkills, setOpenSkills] = useState<Set<string>>(new Set());

  const toggleSkillOpen = (id: string) => {
    setOpenSkills((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeCertData = certCategories.find((c) => c.key === activeCert)!;
  const visibleBars = showAllSkills
    ? skillBars
    : skillBars.filter((s) => !s.overflowMore);
  const hiddenCount = skillBars.filter((s) => s.overflowMore).length;

  return (
    <div className={styles.dashboard}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>
          スキルマップ／組織ダッシュボード
          <span className={styles.demoFlag}>v3イメージ・サンプルデータ</span>
        </h1>
        <p className={styles.subtitle}>
          配置変更：資格パネルを上部へ／属人化リスクを最下部へ。資格カテゴリのタブ切替、スキル多数時の「もっと見る」、Excel出力ボタンを追加。
        </p>

        {/* ツールバー */}
        <div className={styles.toolbar}>
          <select className={styles.select} defaultValue="all">
            <option value="all">全社</option>
            <option value="solution">ソリューション開発部</option>
            <option value="finance">金融サービス部</option>
          </select>
          <input
            className={styles.search}
            type="search"
            placeholder="🔍 スキル・資格・名前で検索"
          />
          <button className={styles.primaryButton}>集計</button>
        </div>

        {/* サマリーカード */}
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <div className={styles.label}>登録メンバー数</div>
            <div className={styles.value}>
              {summaryStats.memberCount}
              <span>名</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.label}>登録スキル種類</div>
            <div className={styles.value}>
              {summaryStats.skillTypeCount}
              <span>種類</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.label}>資格保有件数</div>
            <div className={styles.value}>
              {summaryStats.certCount}
              <span>件</span>
            </div>
          </div>
          <div className={cx(styles.statCard, styles.statCardAlert)}>
            <div className={styles.label}>⚠ 保有者1名のスキル</div>
            <div className={styles.value}>
              {summaryStats.riskSkillCount}
              <span>件</span>
            </div>
          </div>
        </div>

        {/* ① 資格別保有者数 */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>資格別保有者数</h2>
              <p className={styles.note}>タブで資格カテゴリを切り替え</p>
            </div>
            <button className={styles.excelButton} onClick={onExportCerts}>
              📥 Excel出力
            </button>
          </div>

          <div className={styles.tabs}>
            {certCategories.map((cat) => (
              <button
                key={cat.key}
                className={cx(styles.tab, activeCert === cat.key && styles.tabActive)}
                onClick={() => setActiveCert(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className={styles.donutWrap}>
            <div className={styles.donut} style={{ background: activeCertData.gradient }}>
              <div className={styles.donutCenter}>
                <b>{activeCertData.total}</b>
                <span>件</span>
              </div>
            </div>
            <div className={styles.donutLegend}>
              {activeCertData.legend.map((item) => (
                <div key={item.label}>
                  <span className={styles.swatch} style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ② スキル別保有者数 */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>スキル別保有者数</h2>
              <p className={styles.note}>
                カテゴリ絞込 → 保有者数の多い順に上位10件 → もっと見る、の3段構え
              </p>
            </div>
            <button className={styles.excelButton}>📥 Excel出力</button>
          </div>

          <div className={styles.tabs}>
            {skillTabs.map((label, i) => (
              <button
                key={label}
                className={cx(styles.tab, activeSkillTab === i && styles.tabActive)}
                onClick={() => setActiveSkillTab(i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            {visibleBars.map((skill) => {
              const isOpen = openSkills.has(skill.id);
              return (
                <div key={skill.id} className={styles.barItem}>
                  <div
                    className={styles.barHead}
                    onClick={() => toggleSkillOpen(skill.id)}
                  >
                    <div>
                      {skill.name}
                      {skill.rare && <span className={styles.rareTag}>1名のみ</span>}
                    </div>
                    <div className={styles.track}>
                      <div
                        className={cx(styles.fill, skill.rare && styles.fillRare)}
                        style={{ width: `${skill.widthPercent}%` }}
                      />
                    </div>
                    <div>{skill.count}名</div>
                    <div className={cx(styles.caret, isOpen && styles.caretOpen)}>▶</div>
                  </div>
                  {isOpen && (
                    <div className={styles.members}>
                      {skill.members.map((m) => (
                        <span key={m} className={styles.memberChip}>
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div className={styles.moreBar}>
              <button onClick={() => setShowAllSkills((v) => !v)}>
                {showAllSkills
                  ? "▲ 上位10件に戻す"
                  : `▼ すべて表示（残り${hiddenCount}件）`}
              </button>
            </div>
          )}
        </div>

        {/* ③ ヒートマップ */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>部署 × スキルカテゴリ 保有者数ヒートマップ</h2>
          <p className={styles.note}>色が濃い＝人数が多い。空白セルが「組織の穴」です</p>
          <table className={styles.heatTable}>
            <thead>
              <tr>
                <th className={styles.rowHeader} />
                {heatColumns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatRows.map((row) => (
                <tr key={row.dept}>
                  <th className={styles.rowHeader}>{row.dept}</th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={heatLevelClass[cell.level]}>
                      {cell.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.heatLegend}>
            少ない
            <i className={styles.h0} />
            <i className={styles.h1} />
            <i className={styles.h2} />
            <i className={styles.h3} />
            <i className={styles.h4} />
            多い
          </div>
        </div>

        {/* ④ 属人化リスク */}
        <div className={cx(styles.panel, styles.riskPanel)}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>⚠ 属人化リスク（保有者1名のスキル）</h2>
              <p className={styles.note}>
                担当者の異動・退職で業務が止まる可能性があるスキルの一覧
              </p>
            </div>
            <button className={styles.excelButton} onClick={onExportRisk}>
              📥 Excel出力
            </button>
          </div>
          {riskItems.map((item) => (
            <div key={item.skill} className={styles.riskRow}>
              <div>
                <b>{item.skill}</b>
                <div className={styles.who}>{item.who}</div>
              </div>
              <span className={styles.riskBadge}>1名のみ</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
