/**
 * imageMeta 구조
 * {
 *   id: number | null,
 *   uuid: string | null,
 *   fileName: string,
 *   previewUrl: string | null,   // Blob URL (새로고침 후 자동 invalid → usePreviewSource가 fallback)
 *   createdAt: number | string,  // 서버 or 임시 timestamp
 *   originalUrl?: string,
 *   resizedUrl?: string
 * }
 */

const STORAGE_KEY = "imageMeta";

/** 안전하게 로드 */
function loadList() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("imageMetaStore.loadList error:", e);
        return [];
    }
}

/** 전체 저장 */
function saveList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** fileName으로 특정 항목 가져오기 */
function get(id) {
    const list = loadList();
    return list.find((m) => m.id === id) || null;
}

/** id로 항목 가져오기 (DetailPage에서 사용 가능) */
function getById(id) {
    const list = loadList();
    return list.find((m) => m.id === id) || null;
}

/**
 * upsert(meta)
 * --------------------------------------------------------------
 * uuid가 같은 항목이 있으면 덮어쓰기
 * 없으면 push
 *
 * preview(blob) + 서버 metadata(id/uuid/resizedUrl/createdAt)
 * 둘 다 여기에서 통합 관리
 * --------------------------------------------------------------
 */
function upsert(meta) {
    const list = loadList();

    let updated = false;

    const newList = list.map((m) => {
        // uuid가 같으면 동일 이미지라고 본다
        if (m.uuid && meta.uuid && m.uuid === meta.uuid) {
            updated = true;
            return { ...m, ...meta };
        }

        return m;
    });

    // 기존 항목을 하나도 업데이트하지 못했다면 push
    if (!updated) newList.push(meta);

    saveList(newList);
}

/** previewUrl만 변경 */
function updatePreview(id, previewUrl) {
    const list = loadList();
    const updated = list.map((m) =>
        m.id === id ? { ...m, previewUrl } : m
    );
    saveList(updated);
}




export const imageMetaStore = {
    loadList,
    saveList,
    get,
    getById,
    upsert,
    updatePreview,
};