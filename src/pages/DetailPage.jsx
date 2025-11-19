import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";
import { imageMetaStore } from "../utils/imageMeta";
import { usePreviewSource } from "../hooks/usePreviewSource";

export default function DetailPage() {
  /**
   * 라우터 매핑 규칙
   * - /detail/:id           → { id: "3" }
   * - /detail/file/:value   → { value: "abc.png" }
   *
   * 따라서:
   * - value 가 있으면: 파일명 기반(로컬/캐시 모드)
   * - id 가 있으면:     서버 PK 기반(서버 모드)
   */
  const { id, value } = useParams();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * 1단계: 상세 정보(메타데이터) 결정
   *
   * - value 가 존재 → /detail/file/:fileName 으로 들어온 경우
   *    → 클라이언트 캐시(imageMeta)에서 먼저 찾고, 없으면 서버 list()에서 파일명으로 검색
   *
   * - value 가 없고 id 가 존재 → /detail/:id 로 들어온 경우
   *    → 서버 detail(id)로 조회
   *
   * - 둘 다 없으면 → 잘못된 경로이므로 image=null 처리
   */
  useEffect(() => {
    let cancelled = false;

    const resolveImage = async () => {
      if (value) {
        const localMeta = imageMetaStore.find(value);
        if (localMeta) {
          return {
            id: "local",
            fileName: localMeta.fileName,
            uuid: null,
            resizedUrl: null,
            createdAt: localMeta.createdAt,
          };
        }

        const res = await imageApi.list();
        return res.data.find((item) => item.fileName === value) ?? null;
      }

      if (id) {
        const res = await imageApi.detail(id);
        return res.data;
      }

      return null;
    };

    (async () => {
      setLoading(true);

      try {
        const data = await resolveImage();
        if (!cancelled) setImage(data);
      } catch (err) {
        console.error("상세 조회 실패:", err);
        if (!cancelled) setImage(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, value]);

  const fallbackResolver = useCallback(async () => {
    if (!image) return null;
    if (image.resizedUrl) return image.resizedUrl;

    if (image.id && image.id !== "local") {
      const res = await imageApi.detail(image.id);
      return res.data.resizedUrl;
    }

    if (image.fileName) {
      const listRes = await imageApi.list();
      const match = listRes.data.find((item) => item.fileName === image.fileName);
      return match?.resizedUrl ?? null;
    }

    return null;
  }, [image]);

  const src = usePreviewSource(image?.fileName, fallbackResolver);
  const displaySrc = src || image?.resizedUrl || undefined;

  // 로딩 중 표시
  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;

  // image 자체를 못찾은 경우
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      <img
        src={displaySrc}
        alt={image.fileName}
        style={{
          width: 420,
          height: 420,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #ccc",
          marginBottom: 20,
        }}
      />

      <div style={{ fontSize: 14 }}>
        <p>
          <strong>파일명:</strong> {image.fileName}
        </p>
        <p>
          <strong>UUID:</strong> {image.uuid}
        </p>
        <p>
          <strong>업로드 시각:</strong>{" "}
          {new Date(image.createdAt).toLocaleString()}
        </p>
      </div>

      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로
      </Link>
    </div>
  );
}
