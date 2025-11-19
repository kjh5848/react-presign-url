import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import usePreviewSource from "../hooks/usePreviewSource";
import { imageApi } from "../api/imageApi";
import { imageMetaStore } from "../utils/imageMetaStore";

/**
 * DetailPage
 * --------------------------------------------------------------
 * 동작 구조:
 * 
 * 1) /detail/:id 진입
 * 2) localStorage(imageMetaStore)에서 우선 metadata를 가져온다.
 * 3) 없다면:
 *      - 사용자가 목록을 거치지 않고 /detail/:id URL을 직접 입력한 경우
 *      - localStorage가 수동 삭제됨
 *      - 또는 로컬 캐싱(TTL 등) 정책에 의해 캐싱이 만료된 경우
 *    → 서버 detail(id)로 데이터를 복구
 * 
 * 4) preview(blob) → fallbackSrc(resizedUrl) 자동 적용 (usePreviewSource)
 * --------------------------------------------------------------
 */

export default function DetailPage() {
  const { id } = useParams();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Step 1 — localStorage 기반 즉시 읽기
   */
  useEffect(() => {
    const local = imageMetaStore.getById(id);

    if (local) {
      setImage(local);
      setLoading(false);
      return;
    }

    // localStorage에 없으면 → 서버 호출 (detail API)
    const fetchFromServer = async () => {
      try {
        const res = await imageApi.detail(id); // ← 정석
        const data = res.data;

        // localStorage 복구
        imageMetaStore.upsert({
          id: data.id,
          uuid: data.uuid,
          fileName: data.fileName,
          previewUrl: null,
          createdAt: data.createdAt,
          originalUrl: data.originalUrl,
          resizedUrl: data.resizedUrl,
        });

        setImage(data);
      } catch (err) {
        console.error("detail 복구 실패:", err);
        setImage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFromServer();
  }, [id]);

  /**
   * Step 3 — usePreviewSource로 preview(blob) → resizedUrl 자동 전환
   */
  const imgId = image?.id ?? null;
  const fallback = image?.resizedUrl ?? null;
  const src = usePreviewSource(imgId, fallback);

  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      {/* 이미지 출력 */}
      <img
        src={src}
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

      {/* 메타 정보 */}
      <div style={{ fontSize: 14 }}>
        <p><strong>파일명:</strong> {image.fileName}</p>
        <p><strong>UUID:</strong> {image.uuid}</p>
        <p>
          <strong>업로드 시간:</strong>{" "}
          {new Date(image.createdAt).toLocaleString()}
        </p>
      </div>

      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로
      </Link>
    </div>
  );
}