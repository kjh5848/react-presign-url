import React, { useEffect, useState } from "react";
import { imageApi } from "../api/imageApi";
import { Link } from "react-router-dom";
import usePreviewSource from "../hooks/usePreviewSource";
import { imageMetaStore } from "../utils/imageMetaStore";

/**
 * ListPage — localStorage 기반 + preview 폴백 구조
 * --------------------------------------------------------------
 * 동작 흐름:
 *
 * 1) 페이지 최초 진입 시 list() API 한 번 호출
 *    - id, uuid, fileName, originalUrl, resizedUrl, createdAt 포함
 *
 * 2) localStorage(imageMetaStore)에 저장된 previewUrl(blob)과 응답받은 DTO를 merge
 *    - preview(blob)가 살아 있으면 즉시 표시
 *    - preview(blob)가 죽었으면 usePreviewSource 훅이 자동 폴백(resizedUrl)
 *
 * 3) 새로고침 이후에도 localStorage에서 previewUrl 문자열은 남아 있음
 *    → usePreviewSource 훅이 blob 죽은 것을 감지하고 fallback 적용
 * --------------------------------------------------------------
 */

export default function ListPage() {
  const [images, setImages] = useState([]);

  /**
   * Step 1.
   * localStorage가 있으면 API 호출 안 함
   */
  useEffect(() => {
    const localList = imageMetaStore.loadList();

    // 1) 로컬스토리지에 데이터가 있다면 → 즉시 렌더링 (서버 요청 X)
    if (localList && localList.length > 0) {
      setImages(localList);
      return;
    }

    // 2) 로컬스토리지가 비어있다면 → 최초 진입 → 서버에서 가져오기
    const loadFromServer = async () => {
      try {
        const res = await imageApi.list();
        const serverList = res.data;

        // 서버 데이터를 로컬스토리지로 캐싱
        serverList.forEach((item) => {
          imageMetaStore.upsert({
            id: item.id,
            uuid: item.uuid,
            fileName: item.fileName,
            previewUrl: null,
            createdAt: item.createdAt,
            originalUrl: item.originalUrl,
            resizedUrl: item.resizedUrl,
          });
        });

        setImages(imageMetaStore.loadList());
      } catch (err) {
        console.error("list 에러:", err);
      }
    };

    loadFromServer();
  }, []);

  /**
   * 이미지 하나 표시 컴포넌트
   * usePreviewSource 훅으로 preview → fallbackSrc 자동 전환
   */
  const ImageItem = ({ img }) => {
    const src = usePreviewSource(img.id, img.resizedUrl);

    return (
      <Link to={`/detail/${img.id}`}>
        <img
          src={src}
          alt={img.fileName}
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

  // 빈 상태 처리
  if (!images || images.length === 0)
    return <p style={{ padding: 20 }}>업로드된 이미지가 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 목록</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img) => (
          <ImageItem key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}