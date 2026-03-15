/**
 * 学期分類ロジック
 * コース名・タイトル文字列から学期ラベルを推定する
 */

/**
 * コース名から学期ラベルを推定する
 * @param courseTitle コース名（例: "2025年度 前期 線形代数"）
 * @returns 学期ラベル（例: "2025前期"）または "その他"
 */
export function classifySemester(courseTitle: string): string {
    // 年度を抽出（4桁の数字）
    const yearMatch = courseTitle.match(/(\d{4})(?:年度?|S)/);
    const year = yearMatch ? yearMatch[1] : null;

    // 学期キーワードのマッチング
    // 前期系
    if (/前期/.test(courseTitle)) {
        return year ? `${year}前期` : '前期';
    }
    // 後期系
    if (/後期/.test(courseTitle)) {
        return year ? `${year}後期` : '後期';
    }
    // 春学期系（春Ⅰ, 春Ⅱ, 春）
    if (/春/.test(courseTitle)) {
        return year ? `${year}春` : '春';
    }
    // 秋学期系（秋Ⅰ, 秋Ⅱ, 秋）
    if (/秋/.test(courseTitle)) {
        return year ? `${year}秋` : '秋';
    }
    // 夏学期
    if (/夏/.test(courseTitle)) {
        return year ? `${year}夏` : '夏';
    }
    // 冬学期
    if (/冬/.test(courseTitle)) {
        return year ? `${year}冬` : '冬';
    }
    // "2025S" 形式 → 春
    const shortSpringMatch = courseTitle.match(/(\d{4})S/);
    if (shortSpringMatch) {
        return `${shortSpringMatch[1]}春`;
    }
    // "2025F" 形式 → 秋
    const shortFallMatch = courseTitle.match(/(\d{4})F/);
    if (shortFallMatch) {
        return `${shortFallMatch[1]}秋`;
    }
    // 年度のみ判定できる場合
    if (year) {
        return `${year}年度`;
    }

    return 'その他';
}

/**
 * 学期ラベルのソートキーを返す（年度降順、学期順）
 */
export function semesterSortKey(label: string): string {
    // 年度を抽出
    const yearMatch = label.match(/^(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '0000';

    // 学期の順序: 春/前期 < 夏 < 秋/後期 < 冬 < 年度 < その他
    const order: { [key: string]: number } = {
        '春': 1,
        '前期': 1,
        '夏': 2,
        '秋': 3,
        '後期': 3,
        '冬': 4,
        '年度': 5,
    };
    const termPart = label.replace(/^\d{4}/, '');
    const termOrder = order[termPart] ?? 9;

    // 年度降順（大きいほど先）にするため9999から引く
    return `${9999 - Number(year)}_${termOrder}`;
}
