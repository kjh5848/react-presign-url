import { useEffect, useState } from "react";
import { imageMetaStore } from "../utils/imageMeta";

/**
 * id 기준 preview → preview 없으면 → 서버 리사이즈 URL
 */
export function usePreviewSource(image) {
    const [src, setSrc] = useState(null);

    useEffect(() => {
        // 이미지가 없으면 초기화
        if (!image) {
            setSrc(null);
            return;
        }

        // 세션스토어 우선 조회 (없으면 image 객체 자체 사용)
        const meta = image.id ? imageMetaStore.find(image.id) : null;
        const previewUrl = meta?.previewUrl ?? image.previewUrl;
        const resizedUrl = meta?.resizedUrl ?? image.resizedUrl;

        // preview가 없으면 즉시 resized로 설정
        if (!previewUrl) {
            setSrc(resizedUrl ?? null);
            return;
        }

        let cancelled = false;

        // preview가 있으면 먼저 표시하고 깨지면 fallback
        setSrc(previewUrl);
        fetch(previewUrl)
            .then((res) => {
                if (!res.ok) throw new Error("preview 없음");
            })
            .catch(() => {
                if (!cancelled) setSrc(resizedUrl ?? null);
            });

        return () => {
            cancelled = true;
        };
    }, [image]);

    return src;
}
