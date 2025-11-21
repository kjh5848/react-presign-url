import React, { useEffect, useState } from "react";
import { imageApi } from "../api/imageApi";
import { imageMetaStore } from "../utils/imageMeta";
import { Link } from "react-router-dom";
import { usePreviewSource } from "../hooks/usePreviewSource";

export default function ListPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  

  /**
   * 1. 세션스토어에 데이터가 있으면 즉시 렌더링
   * 2. 세션스토어가 비어 있으면 서버 API 호출
   */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1) 세션스토어에서 읽기
      const localList = imageMetaStore.getAll();

      if (localList.length > 0) {
        // 세션에 데이터가 있으므로 이것을 먼저 화면에 즉시 렌더링
        setImages(localList);
        setLoading(false);
        return;
      }

      // 2) 세션스토어가 비어 있으므로 서버 API 호출
      try {
        const res = await imageApi.list();
        const data = res.data;
        setImages(data);

        // 서버 데이터를 그대로 세션스토어에 저장
        imageMetaStore.setAll(
          data.map(item => ({
            id: item.id,
            uuid: item.uuid,
            fileName: item.fileName,
            resizedUrl: item.resizedUrl,
            createdAt: item.createdAt,
            previewUrl: null,
          }))
        );
      } catch (err) {
        console.error("목록 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;
  if (images.length === 0) return <p style={{ padding: 20 }}>이미지가 없습니다.</p>;

  // 목록 카드 렌더러: 내부에서 preview 검증 훅 사용
  const ImageItem = ({ img }) => {
    const src = usePreviewSource(img);
    const to = `/detail/${img.id}`;

    return (
      <Link to={to}>
        <img
          src={src || img.resizedUrl || img.previewUrl}
          alt={img.fileName}
          style={{
            width: 350,
            height: 350,
            objectFit: "cover",
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />
      </Link>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 목록</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img) => (
          <ImageItem key={img.id || img.fileName} img={img} />
        ))}
      </div>
    </div>
  );
}
