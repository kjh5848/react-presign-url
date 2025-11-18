import React, { useEffect, useState } from "react";
import { imageApi } from "../api/imageApi";
import { Link } from "react-router-dom";

/**
 * ListPage
 * - sessionStorage imageMeta가 있으면 서버 요청 없이 목록 구성
 * - sessionStorage가 없으면 서버 목록 API 호출
 * - Blob URL(업로드 직후 미리보기)은 유효성 검사 후 문제가 있으면 제거하고 resizedUrl로 대체
 */
export default function ListPage() {
  const [images, setImages] = useState([]);

  /**
   * useEffect #1
   * - sessionStorage의 imageMeta가 존재하면 캐싱된 목록을 우선 사용
   * - imageMeta가 없으면 서버 리스트 조회
   */
  useEffect(() => {
    const load = async () => {
      try {
        const raw = sessionStorage.getItem("imageMeta");
        const metaList = raw ? JSON.parse(raw) : [];

        // (1) 클라이언트 캐시를 사용한 목록 구성
        if (metaList.length === 0) {
          // metaList가 없으면 서버 목록 API 호출
          const res = await imageApi.list();
          setImages(res.data);
          return;
        }
        // metaList가 1개 이상 존재하는 경우
        // 각 항목의 previewUrl이 없으면 서버 응답 값으로 대체
        const serverRes = await imageApi.list();
        const serverList = serverRes.data;
        const clientList = metaList.map(m => {
          const server = serverList.find(s => s.fileName === m.fileName);
          return {
            id: server?.id ?? m.fileName,
            uuid: server?.uuid ?? null,
            originalUrl: server?.originalUrl ?? null,
            resizedUrl: server?.resizedUrl ?? null,
            fileName: m.fileName,
            createdAt: m.createdAt,
            previewUrl: m.previewUrl
          };
        });
        setImages(clientList);
      } catch (err) {
        console.error("List load failed:", err);
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
    // metaList 읽기
    const raw = sessionStorage.getItem("imageMeta");
    const metaList = raw ? JSON.parse(raw) : [];
    const meta = metaList.find((m) => m.fileName === img.fileName);

    const cachedPreview = meta ? meta.previewUrl : null;

    const [src, setSrc] = useState(cachedPreview || img.resizedUrl || null);

    useEffect(() => {
      if (!cachedPreview) {
        // previewUrl 없으면 서버 resizedUrl
        if (img.resizedUrl) setSrc(img.resizedUrl);
        return;
      }
    
      // previewUrl 일단 사용
      setSrc(cachedPreview);
    
      // Blob URL 유효성 검사
      fetch(cachedPreview)
        .then((res) => {
          if (!res.ok) throw new Error("Invalid Blob");
        })
        .catch(() => {
          // Blob 깨짐 → previewUrl 삭제
          const updated = metaList.map((m) =>
            m.fileName === img.fileName ? { ...m, previewUrl: null } : m
          );
          sessionStorage.setItem("imageMeta", JSON.stringify(updated));
    
          // 대체용으로 서버 resizedUrl 사용
          if (img.resizedUrl) setSrc(img.resizedUrl);
        });
    }, [cachedPreview, img.resizedUrl]);

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
          src={src}
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
