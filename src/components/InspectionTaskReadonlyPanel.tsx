'use client';

import type { InspectionTaskDetail } from '@/lib/api';
import {
  buildInspectionTaskFactItems,
  getInspectionRawDataCellState,
} from './inspection-task-readonly-panel';
import styles from './InspectionTaskReadonlyPanel.module.css';

interface InspectionTaskReadonlyPanelProps {
  detail: InspectionTaskDetail;
  factsTitle?: string;
  rawDataTitle?: string;
  aiSummaryTitle?: string;
  emptyRawDataText?: string;
}

export function InspectionTaskReadonlyPanel({
  detail,
  factsTitle = '任务单数据详情',
  rawDataTitle = '原始数据还原',
  aiSummaryTitle = '已有审核结论',
  emptyRawDataText = '当前任务没有可用的原始数据预览。',
}: InspectionTaskReadonlyPanelProps) {
  const factItems = buildInspectionTaskFactItems(detail);

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{factsTitle}</div>
        <div className={styles.grid}>
          {factItems.map((item) => (
            <div key={item.label} className={styles.gridItem}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>{rawDataTitle}</div>
        {detail.rawDataImageName && (
          <div className={styles.meta}>原始记录图片：{detail.rawDataImageName}</div>
        )}
        {!detail.rawDataPreview ? (
          <div className={styles.empty}>{emptyRawDataText}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {detail.rawDataPreview.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.rawDataPreview.rows.map((row, rowIndex) => (
                  <tr key={`${row[0]}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => {
                      const cellState = getInspectionRawDataCellState(
                        detail.rawDataPreview!,
                        rowIndex,
                        cellIndex
                      );

                      return (
                        <td
                          key={`${rowIndex}-${cellIndex}-${cell}`}
                          className={
                            cellState === 'flagged'
                              ? styles.cellFlagged
                              : cellState === 'resolved'
                                ? styles.cellResolved
                                : undefined
                          }
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>{aiSummaryTitle}</div>
        <div className={styles.summary}>
          {detail.aiReviewSummary || '当前没有已有 AI 结论。'}
        </div>
        {(detail.reviewComment || detail.reviewedAt) && (
          <div className={styles.meta}>
            审核备注：{detail.reviewComment || '无'}。审核时间：{detail.reviewedAt || '未记录'}。
          </div>
        )}
      </section>
    </div>
  );
}
