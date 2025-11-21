import { useEffect, useState } from "react";
import { imageStore } from "../store/imageStore";

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
        const sessionImage = image.id ? imageStore.find(image.id) : null;
        const previewUrl = sessionImage?.previewUrl ?? image.previewUrl;
        const resizedUrl = sessionImage?.resizedUrl ?? image.resizedUrl;

        // preview가 없으면 즉시 resized로 설정
        if (!previewUrl) {
            setSrc(resizedUrl ?? null);
            return;
        }

        // preview가 있으면 먼저 표시하고 없으면 fallback
        setSrc(previewUrl);

        fetch(previewUrl)
            .then((res) => {
                if (!res.ok) throw new Error("previewUrl 없음");
            })
            .catch(() => {
                // preview가 없으면 바로 resizedUrl 사용
                setSrc(resizedUrl ?? null);
            });
    }, [image]);

    return src;
}
