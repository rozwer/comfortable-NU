/**
 * 日付選択モーダルコンポーネント
 * 課題完了時の日時入力用UI
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from './helper';

interface DatepickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string) => void;
  initialDate?: string;
}

/**
 * 日付選択モーダルコンポーネント
 * 年月日時を選択できるUIを提供します
 */
export const DatepickerModal: React.FC<DatepickerModalProps> = ({ isOpen, onClose, onSave, initialDate }) => {
  // 多言語対応
  const title = useTranslation('datepicker_modal_title');
  const permanentLabel = useTranslation('datepicker_modal_permanent');
  const yearLabel = useTranslation('datepicker_modal_year');
  const monthLabel = useTranslation('datepicker_modal_month');
  const dayLabel = useTranslation('datepicker_modal_day');
  const hourLabel = useTranslation('datepicker_modal_hour');
  const permanentInfo = useTranslation('datepicker_modal_permanent_info');
  const cancelText = useTranslation('datepicker_modal_cancel');
  const saveText = useTranslation('datepicker_modal_save');
  
  // 現在時刻から初期値を設定
  const now = new Date();
  const initDate = initialDate ? new Date(initialDate.replace(/\//g, '-')) : now;
  
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth() + 1);
  const [day, setDay] = useState(initDate.getDate());
  const [hour, setHour] = useState(initDate.getHours());
  const [isPermanent, setIsPermanent] = useState(false);

  // モーダル外側をクリックした時に閉じる
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 保存処理
  const handleSave = () => {
    if (isPermanent) {
      // 永久オプションが選択された場合は、現在時刻から1年後の日付を設定
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      const permYear = oneYearLater.getFullYear();
      const permMonth = String(oneYearLater.getMonth() + 1).padStart(2, '0');
      const permDay = String(oneYearLater.getDate()).padStart(2, '0');
      const permHour = String(oneYearLater.getHours()).padStart(2, '0');
      
      onSave(`${permYear}/${permMonth}/${permDay}/${permHour}`);
    } else {
      // 通常の日付選択の場合
      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const formattedHour = String(hour).padStart(2, '0');
      
      onSave(`${year}/${formattedMonth}/${formattedDay}/${formattedHour}`);
    }
  };

  // モーダルが閉じている場合は何もレンダリングしない
  if (!isOpen) return null;

  // 月に応じた日数のオプションを生成
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInSelectedMonth = getDaysInMonth(year, month);

  const content = (
    <div className="cs-datepicker-overlay" onClick={handleOutsideClick}>
      <div className="cs-datepicker-modal">
        <div className="cs-datepicker-header">
          <h3>{title}</h3>
          <button className="cs-datepicker-close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="cs-datepicker-content">
          {/* 永久オプションのチェックボックス */}
          <div className="cs-datepicker-permanent-option">
            <label className="cs-datepicker-permanent-label">
              <input 
                type="checkbox" 
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="cs-datepicker-permanent-checkbox"
              />
              {permanentLabel}
            </label>
          </div>
          
          {/* 日付選択フィールド（永久オプションが無効の場合のみ表示） */}
          {!isPermanent && (
            <div className="cs-datepicker-row">
              <div className="cs-datepicker-field">
                <label>{yearLabel}</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              
              <div className="cs-datepicker-field">
                <label>{monthLabel}</label>
                <select 
                  value={month} 
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div className="cs-datepicker-field">
                <label>{dayLabel}</label>
                <select 
                  value={day}
                  onChange={(e) => setDay(parseInt(e.target.value))}
                >
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <div className="cs-datepicker-field">
                <label>{hourLabel}</label>
                <select 
                  value={hour} 
                  onChange={(e) => setHour(parseInt(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* 永久オプションが選択された場合の説明 */}
          {isPermanent && (
            <div className="cs-datepicker-permanent-info">
              <p>{permanentInfo}</p>
            </div>
          )}
        </div>
        
        <div className="cs-datepicker-footer">
          <button className="cs-datepicker-cancel-button" onClick={onClose}>{cancelText}</button>
          <button className="cs-datepicker-save-button" onClick={handleSave}>{saveText}</button>
        </div>
      </div>
    </div>
  );

  // 変換済み祖先の影響を避けるため、ポータルで<body>直下に描画
  return createPortal(content, document.body);
};
