import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";
import { imageMetaStore } from "../utils/imageMeta";
import { usePreviewSource } from "../hooks/usePreviewSource";

export default function DetailPage() {
  const { id } = useParams();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) 세션스토어 → 없으면 서버 조회 후 세션에 캐시
  useEffect(() => {
    const load = async () => {
      const local = imageMetaStore.find(Number(id));
      if (local) {
        setImage(local);
        setLoading(false);
        return;
      }

      // 2) 서버 조회
      try {
        const res = await imageApi.detail(id);
        const data = res.data;
        setImage(data);

        // 상세 조회 결과를 세션스토어에 저장해 다음 접근 시 재사용
        imageMetaStore.add({
          id: data.id,
          fileName: data.fileName,
          resizedUrl: data.resizedUrl,
          createdAt: data.createdAt,
          previewUrl: null, // 상세 응답에는 preview가 없으니 명시적으로 비워둠
          uuid: data.uuid,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // preview → 깨지면 resizedUrl
  const ImageViewer = ({ item }) => {
    const src = usePreviewSource(item);
    return (
      <img
        src={src || item?.resizedUrl || item?.previewUrl}
        alt={item?.fileName}
        style={{
          width: 420,
          height: 420,
          objectFit: "cover",
          border: "1px solid #ccc",
          borderRadius: 8,
          marginBottom: 20,
        }}
      />
    );
  };

  if (loading) return <p>로딩 중…</p>;
  if (!image) return <p>이미지 없음</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세</h2>

      <ImageViewer item={image} />

      <p><strong>ID:</strong> {image.id}</p>
      <p><strong>파일명:</strong> {image.fileName}</p>
      <p><strong>uuid:</strong> {image.uuid}</p>

      <Link to="/">← 목록</Link>
    </div>
  );
}
