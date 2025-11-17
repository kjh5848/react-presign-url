import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function DetailPage() {
  const { id } = useParams(); // URL의 /detail/:id 값 가져오기
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await imageApi.detail(id);
        setImage(res.data);
      } catch (err) {
        console.error("이미지 정보를 불러오지 못했습니다:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      <img
        src={image.resizedUrl}
        alt={image.uuid}
        style={{
          width: 400,
          borderRadius: 8,
          border: "1px solid #ddd",
          marginBottom: 15,
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
          <strong>업로드 시간:</strong>{" "}
          {new Date(image.createdAt).toLocaleString()}
        </p>
      </div>

      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로 돌아가기
      </Link>
    </div>
  );
}
