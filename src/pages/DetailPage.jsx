import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function DetailPage() {
  // 1. URL 파라미터에서 이미지 id 추출
  const { id } = useParams();

  // 2. 서버에서 받아온 이미지 정보를 저장하는 상태
  const [image, setImage] = useState(null);

  // 3. 상세 정보 로딩 상태
  const [loading, setLoading] = useState(true);

  // 4. 실제로 화면에 표시될 이미지 주소
  //    - Blob URL(업로드 직후)
  //    - S3 리사이즈 URL(fallback)
  const [src, setSrc] = useState(null);

  /**
   * useEffect #1
   * - 상세 정보를 sessionStorage에서 우선 조회, 없으면 서버(Spring)에서 조회한다.
   * - 응답을 받으면 image 상태를 채우고 loading 종료.
   */
  useEffect(() => {
    const load = async () => {
      const metaList = JSON.parse(sessionStorage.getItem("imageMeta"));
      const localMeta = metaList.find(m => m.fileName === id || m.id === id);
      if (localMeta) {
        setImage({
          id,
          uuid: null,
          fileName: localMeta.fileName,
          resizedUrl: null,
          createdAt: localMeta.createdAt
        });
        setLoading(false);
        return;
      }
      try {
        const res = await imageApi.detail(id);
        setImage(res.data);
      } catch (e) {
        console.error("상세 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /**
   * useEffect #2
   * - image가 준비된 후 실제 화면에 보여줄 src를 결정한다.
   *
   * 캐싱/이미지 처리 흐름
   * ----------------------------------------------------
   * 1) sessionStorage에 저장된 previewUrl 유무 확인 (localMeta.previewUrl)
   * 2) 없으면 Blob URL("img:<fileName>") 유무 확인
   * 3) Blob URL이 없으면 → 바로 S3 리사이즈 URL을 사용한다.
   * 4) Blob URL이 있으면 → UI에 바로 표시(즉시 렌더링)
   *    이어서 Blob URL이 실제로 유효한지 fetch로 검사
   *    - Blob이 깨졌으면 제거하고 S3 URL로 대체한다.
   * ----------------------------------------------------
   *
   * 이 로직의 목적
   * - 업로드 직후에는 즉시 미리보기(Blob)를 보여주지만,
   * - 새로고침 등으로 Blob이 유실되었을 때 자동 복구(fallback)한다.
   */
  useEffect(() => {
    if (!image) return;

    // Check for previewUrl in localMeta first
    const metaList = JSON.parse(sessionStorage.getItem("imageMeta")) || [];
    const localMeta = metaList.find(m => m.fileName === image?.fileName);
    if (localMeta && localMeta.previewUrl) {
      setSrc(localMeta.previewUrl);
      return;
    }

    const blobKey = "img:" + image.fileName;
    const cachedBlobUrl = sessionStorage.getItem(blobKey);

    // 최신 리사이즈 URL 조회 함수
    const fetchLatest = async () => {
      try {
        const res = await imageApi.detail(image.id);
        setSrc(res.data.resizedUrl);
      } catch (e) {
        console.error("최신 정보 요청 실패:", e);
      }
    };

    // Blob 캐싱이 없으면 → 바로 리사이즈 URL 사용
    if (!cachedBlobUrl) {
      fetchLatest();
      return;
    }

    // Blob 캐싱이 있으면 → 즉시 표시
    setSrc(cachedBlobUrl);

    // Blob 데이터 실제 유효성 검사
    let cancelled = false;
    fetch(cachedBlobUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid Blob");
      })
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem(blobKey);
        fetchLatest();
      });

    return () => {
      cancelled = true;
    };
  }, [image]);

  // 로딩 처리
  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      {/**
       * 실제 화면에 표시되는 이미지
       * - 업로드 후 바로 보는 경우 Blob URL이 표시된다.
       * - 새로고침 후 Blob이 깨지면 자동으로 S3 리사이즈 URL로 전환된다.
       */}
      <img
        src={src}
        alt={image.uuid}
        style={{
          width: 420,
          borderRadius: 8,
          border: "1px solid #ddd",
          marginBottom: 15,
        }}
      />

      {/* 이미지 메타 정보 */}
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

      {/* 목록으로 이동 */}
      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로 돌아가기
      </Link>
    </div>
  );
}