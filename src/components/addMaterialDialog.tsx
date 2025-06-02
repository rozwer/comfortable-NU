/**
 * 授業資料追加・編集用のダイアログコンポーネント
 * 授業資料の名前とURLを入力・編集するモーダルUI
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Material } from '../features/entity/material/types';
import { useTranslation } from './helper';

interface AddMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  material?: Material; // 編集時に使用、新規追加時はundefined
  courseId?: string; // 選択中のコースID（オプション）
}

/**
 * 授業資料追加・編集モーダルコンポーネント
 * 授業資料の名前とURLを編集するUIを提供します
 */
export const AddMaterialDialog: React.FC<AddMaterialDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  material,
  courseId
}) => {
  // 多言語対応
  const titleAdd = useTranslation('add_material_dialog_title_add');
  const titleEdit = useTranslation('add_material_dialog_title_edit');
  const materialNameLabel = useTranslation('add_material_dialog_material_name');
  const urlLabel = useTranslation('add_material_dialog_material_url');
  const materialNamePlaceholder = useTranslation('add_material_dialog_material_name_placeholder');
  const urlPlaceholder = useTranslation('add_material_dialog_url_placeholder');
  const cancelText = useTranslation('add_material_dialog_cancel');
  const saveText = useTranslation('add_material_dialog_save');
  const errorNameRequired = useTranslation('add_material_dialog_error_name_required');
  const errorUrlRequired = useTranslation('add_material_dialog_error_url_required');
  const errorInvalidUrl = useTranslation('add_material_dialog_error_invalid_url');
  
  // フォーム状態
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<{name?: string; url?: string}>({});
  
  // 編集モードの場合、初期値をセット
  useEffect(() => {
    if (material) {
      setName(material.name);
      setUrl(material.url);
    } else {
      // 新規作成時はフォームをリセット
      setName('');
      setUrl('');
    }
    // エラーをリセット
    setErrors({});
  }, [material, isOpen]);

  // モーダル外側をクリックした時に閉じる
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 保存前のバリデーション
  const validateForm = useCallback(() => {
    const newErrors: {name?: string; url?: string} = {};
    let isValid = true;
    
    if (!name.trim()) {
      newErrors.name = errorNameRequired;
      isValid = false;
    }
    
    if (!url.trim()) {
      newErrors.url = errorUrlRequired;
      isValid = false;
    } else {
      try {
        // URLの形式チェック（完全でなくても基本的な検証）
        new URL(url);
      } catch (e) {
        newErrors.url = errorInvalidUrl;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  }, [name, url, errorNameRequired, errorUrlRequired, errorInvalidUrl]);

  // 保存処理
  const handleSave = () => {
    if (validateForm()) {
      onSave({
        name: name.trim(),
        url: url.trim(),
        courseId
      });
    }
  };

  // モーダルが閉じている場合は何もレンダリングしない
  if (!isOpen) return null;

  return (
    <div className="cs-material-dialog-overlay" onClick={handleOutsideClick}>
      <div className="cs-material-dialog-modal">
        <div className="cs-material-dialog-header">
          <h3>{material ? titleEdit : titleAdd}</h3>
          <button className="cs-material-dialog-close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="cs-material-dialog-content">
          <div className="cs-material-dialog-form-group">
            <label htmlFor="material-name">{materialNameLabel}</label>
            <input
              id="material-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={materialNamePlaceholder}
            />
            {errors.name && <div className="cs-material-dialog-error">{errors.name}</div>}
          </div>
          
          <div className="cs-material-dialog-form-group">
            <label htmlFor="material-url">{urlLabel}</label>
            <input
              id="material-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={urlPlaceholder}
            />
            {errors.url && <div className="cs-material-dialog-error">{errors.url}</div>}
          </div>
        </div>
        
        <div className="cs-material-dialog-footer">
          <button className="cs-material-dialog-cancel-button" onClick={onClose}>
            {cancelText}
          </button>
          <button className="cs-material-dialog-save-button" onClick={handleSave}>
            {saveText}
          </button>
        </div>
      </div>
    </div>
  );
};