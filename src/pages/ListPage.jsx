import React, { useCallback, useEffect, useState } from "react";
import { imageApi } from "../api/imageApi";
import { Link } from "react-router-dom";
import { imageMetaStore } from "../utils/imageMeta";
import { usePreviewSource } from "../hooks/usePreviewSource";

/**
 * ListPage
 * - 서버 목록 API를 기본으로 사용하고, sessionStorage imageMeta(업로드 직후 프리뷰)를 병합
 * - Blob URL(업로드 직후 미리보기)은 유효성 검사 후 문제가 있으면 제거하고 resizedUrl로 대체
 */
export default function ListPage() {
  const [images, setImages] = useState([]);

  /**
   * useEffect #1
   * - 서버 리스트를 조회하고, 업로드 성공 이력이 있는 preview(meta)와 병합
   */
  useEffect(() => {
    const load = async () => {
      const uploadedMeta = imageMetaStore.all({ includePending: false });

      try {
        const res = await imageApi.list();
        const serverList = res.data;

        if (uploadedMeta.length === 0) {
          setImages(serverList);
          return;
        }

        const serverWithLocalMeta = serverList.map((item) => {
          const meta = uploadedMeta.find((m) => m.fileName === item.fileName);
          return meta ? { ...item, createdAt: meta.createdAt } : item;
        });

        const missingOnServer = uploadedMeta
          .filter((meta) => !serverList.some((s) => s.fileName === meta.fileName))
          .map((meta) => ({
            id: meta.fileName,
            uuid: null,
            originalUrl: null,
            resizedUrl: null,
            fileName: meta.fileName,
            createdAt: meta.createdAt,
          }));

        setImages([...serverWithLocalMeta, ...missingOnServer]);
      } catch (err) {
        console.error("List load failed:", err);
        if (uploadedMeta.length > 0) {
          setImages(
            uploadedMeta.map((meta) => ({
              id: meta.fileName,
              uuid: null,
              originalUrl: null,
              resizedUrl: null,
              fileName: meta.fileName,
              createdAt: meta.createdAt,
            }))
          );
        }
      }
    };

    load();
  }, []);

  /**
   * 내부 컴포넌트: ImageItem
   * - 캐싱된 previewUrl(Blob)이 있으면 먼저 표시
   * - Blob이 깨졌는지 fetch로 유효성 검사 후 실패하면 제거
   * - previewUrl이 없으면 서버 resizedUrl 사용
   */
  const ImageItem = ({ img }) => {
    const fallback = useCallback(() => img.resizedUrl ?? null, [img.resizedUrl]);
    const src = usePreviewSource(img.fileName, fallback) ?? img.resizedUrl;

    /**
     * 상세 페이지 이동
     * - 로컬 캐시 이미지라면 `/detail/file/:fileName`
     * - 서버 이미지라면 `/detail/:id`
     */
    const detailPath = img.uuid
      ? `/detail/${img.id}`
      : `/detail/file/${img.fileName}`;

    return (
      <Link to={detailPath}>
        <img
          src={src || undefined}
          alt={img.uuid || img.fileName}
          style={{
            width: 350,
            height: 350,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
      </Link>
    );
  };

  // 목록 없을 때
  if (images.length === 0)
    return <p style={{ padding: 20 }}>업로드된 이미지가 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 목록</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img) => (
          <ImageItem key={img.fileName} img={img} />
        ))}
      </div>
    </div>
  );
}
