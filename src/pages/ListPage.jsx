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
  // 1. 서버에서 받아온 이미지 목록 상태
  const [images, setImages] = useState([]);

  /**
   * useEffect #1
   * - sessionStorage에 저장된 imageMeta가 있으면 서버 요청 없이 목록을 구성한다.
   * - imageMeta가 없으면 서버(Spring)에서 목록을 조회한다.
   */
  useEffect(() => {
    const load = async () => {
      try {
        // 클라이언트(sessionStorage)에 저장된 이미지 메타데이터 로드
        const metaList =
          JSON.parse(sessionStorage.getItem("imageMeta")) || [];

        // 경우 1: 로컬에 저장된 메타데이터가 있을 경우 서버 요청 생략
        if (metaList.length > 0) {
          const clientList = metaList.map((m, id) => ({
            id: id + 1,
            uuid: null,
            originalUrl: null,
            resizedUrl: null,
            fileName: m.fileName,
            createdAt: m.createdAt,
            previewUrl: m.previewUrl
          }));
          setImages(clientList);
          return;
        }

        // 경우 2: 로컬 캐시가 없을 경우 Spring 서버에 목록 요청
        const res = await imageApi.list();
        setImages(res.data);
      } catch (err) {
        console.error("List 없음:", err);
      }
    };

    load();
  }, []);

  /**
   * ImageItem
   * - 개별 이미지를 렌더링하는 컴포넌트
   * - sessionStorage에 저장된 previewUrl이 있으면 즉시 그 이미지를 표시한다.
   */
  const ImageItem = ({ img }) => {
    // 로컬 메타데이터에 previewUrl이 저장되어 있으면 즉시 사용
    const metaList =
      JSON.parse(sessionStorage.getItem("imageMeta")) || [];
    const meta = metaList.find((m) => m.fileName === img.fileName);
    const cachedPreview = meta ? meta.previewUrl : null;

    const [src, setSrc] = useState(cachedPreview || img.resizedUrl || null);

    useEffect(() => {
      // previewUrl이 존재하면 검증 없이 그대로 사용
      if (cachedPreview) {
        setSrc(cachedPreview);
        return;
      }

      // previewUrl이 없으면 서버에서 내려온 resizedUrl 표시
      if (img.resizedUrl) {
        setSrc(img.resizedUrl);
      }
    }, [cachedPreview, img.resizedUrl]);

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
          // 개별 이미지 렌더링 컴포넌트
          <ImageItem key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}
