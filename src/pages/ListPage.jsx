import React, { useEffect, useState } from "react";
import { imageApi } from "../api/imageApi";
import { Link } from "react-router-dom";

/**
 * ListPage
 * - 하나의 파일/컴포넌트 안에서 목록 조회 + Blob 캐싱 검증 + fallback 처리까지 모두 수행한다.
 * - ImageItem을 외부로 분리하지 않고 ListPage 내부에 포함된 "내부 컴포넌트"로 선언하여
 *   하나의 컴포넌트 구조처럼 보이도록 단일 구조로 통합하였다.
 */
export default function ListPage() {
  // 1. 서버에서 받아온 이미지 목록 상태
  const [images, setImages] = useState([]);

  /**
   * useEffect #1
   * - 컴포넌트 마운트 시 서버에서 이미지 목록(JSON)을 불러온다.
   */
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await imageApi.list();
        setImages(res.data);
      } catch (err) {
        console.error("이미지 목록을 불러오지 못했습니다:", err);
      }
    };
    fetchImages();
  }, []);

  /**
   * 내부 컴포넌트: ImageItem
   * - 단일 이미지에 대한 Blob 캐시 / S3 URL 결정 로직을 수행한다.
   */
  const ImageItem = ({ img }) => {
    // sessionStorage에 저장된 Blob URL(업로드 직후 이미지)
    const cached = sessionStorage.getItem("img:" + img.fileName);

    // 실제 표시할 이미지 src
    const [src, setSrc] = useState(cached || img.resizedUrl);

    /**
     * Blob URL 유효성 검사 + fallback
     */
    useEffect(() => {
      if (!cached) return;

      let cancelled = false;

      fetch(cached)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Blob URL가 없습니다.");
          }
        })
        .catch(() => {
          if (cancelled) return;
          sessionStorage.removeItem("img:" + img.fileName);
          setSrc(img.resizedUrl);
        });

      return () => {
        cancelled = true;
      };
    }, [cached, img.fileName, img.resizedUrl]);

    return (
      <Link to={`/detail/${img.id}`}>
        <img
          src={src}
          alt={img.uuid}
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
  }

  if (images.length === 0)
    return <p style={{ padding: 20 }}>업로드된 이미지가 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 목록</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img) => (
          // 이미지 컴포넌트
          <ImageItem key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}