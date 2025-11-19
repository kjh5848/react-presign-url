import { useEffect, useState } from "react";
import { imageMetaStore } from "../utils/imageMeta";

/**
 * 공통 preview 처리 훅
 * - Blob URL이 있으면 우선 사용하고 fetch로 유효성 검사
 * - 깨지면 sessionStorage에서 previewUrl 제거 후 fallbackResolver 재실행
 * - Blob이 없으면 fallbackResolver 결과 사용
 */
export function usePreviewSource(fileName, fallbackResolver) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!fileName || typeof fallbackResolver !== "function") return;

    let cancelled = false;

    const resolveFallback = async () => {
      try {
        return await Promise.resolve(fallbackResolver());
      } catch (err) {
        console.error("fallbackResolver failed", err);
        return null;
      }
    };

    const applyFallback = async () => {
      const fallback = await resolveFallback();
      if (!cancelled) setSrc(fallback ?? null);
    };

    const meta = imageMetaStore.find(fileName);
    const previewUrl = meta?.previewUrl ?? null;

    if (previewUrl) {
      setSrc(previewUrl);

      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Invalid blob");
        })
        .catch(async () => {
          imageMetaStore.clearPreview(fileName);
          await applyFallback();
        });
      return () => {
        cancelled = true;
      };
    }

    applyFallback();

    return () => {
      cancelled = true;
    };
  }, [fileName, fallbackResolver]);

  return src;
}
