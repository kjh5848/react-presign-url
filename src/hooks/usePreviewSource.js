// src/hooks/usePreviewSource.js

import { useState, useEffect } from "react";
import { imageMetaStore } from "../utils/imageMetaStore";

/**
 * usePreviewSource — 최종 안정화 버전
 * --------------------------------------------------------------
 * 역할:
 * 1) previewUrl(blob)이 있으면 우선 사용
 * 2) 새로고침으로 blob이 사라지면 → fallbackSrc(resizedUrl)로 전환
 * 3) imageMetaStore에서 previewUrl을 null로 정리
 *
 * 동작 흐름:
 * - 업로드 직후: preview(blob) 표시
 * - 새로고침: blob은 죽지만 previewUrl 문자열은 남아 있음 → fetch 실패 → fallback 적용
 * - detail/list 모두 서버 detail() 호출 없이 동작
 *
 * input:
 *   id    — 이미지 고유 식별자
 *   fallbackSrc — 서버 resizedUrl (항상 존재하는 안전한 이미지)
 * --------------------------------------------------------------
 */

export default function usePreviewSource(id, fallbackSrc = null) {
    const [src, setSrc] = useState(null);

    useEffect(() => {
        if (!id) return;

        const meta = imageMetaStore.get(id);
        const previewUrl = meta?.previewUrl ?? null;

        /**
         * 1) previewUrl(blob)이 있으면 우선 사용
         */
        if (previewUrl) {
            setSrc(previewUrl);

            // Blob URL이 새로고침 후 죽었는지 검사
            fetch(previewUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Blob 삭제됨");
                })
                .catch(() => {
                    // Blob 죽음 → previewUrl 삭제 + fallback으로 교체
                    imageMetaStore.updatePreview(id, null);
                    if (fallbackSrc) setSrc(fallbackSrc);
                });

            return;
        }

        /**
         * 2) previewUrl이 애초에 없으면 바로 fallback 사용
         */
        if (!previewUrl && fallbackSrc) {
            setSrc(fallbackSrc);
        }

    }, [id, fallbackSrc]);

    return src;
}