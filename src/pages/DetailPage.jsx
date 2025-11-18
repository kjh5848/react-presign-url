import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function DetailPage() {
  // 1. URL 파라미터에서 이미지 id 추출
  const { id } = useParams();

  // 2. 서버에서 받아온 이미지 메타데이터를 저장하는 상태
  const [image, setImage] = useState(null);

  // 3. 상세 정보를 불러오는 동안 로딩 상태를 표시하기 위한 상태
  const [loading, setLoading] = useState(true);

  // 4. 실제 화면에 표시할 이미지 주소를 위한 상태
  //    - 업로드 직후에는 sessionStorage에 저장된 Blob URL을 먼저 사용하고,
  //      Blob이 깨진 경우에는 S3 리사이즈 URL(resizedUrl)로 fallback 한다.
  const [src, setSrc] = useState(null);

  /**
   * useEffect #1: 서버에서 이미지 상세 정보를 가져오는 역할
   * - 컴포넌트가 처음 렌더링되거나, URL의 id가 변경될 때만 실행된다.
   * - imageApi.detail(id)를 호출하여 백엔드에서 이미지 정보를 받아온다.
   * - 성공하면 setImage(res.data)를 통해 image 상태를 채운 뒤,
   *   finally 블록에서 로딩 상태를 false로 변경한다.
   */
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

  /**
   * useEffect #2: image 상태가 준비된 이후, 실제로 사용할 이미지 src를 결정하는 역할
   *
   * 동작 흐름
   * 1) image가 아직 없으면(null) 아무 것도 하지 않는다.
   * 2) image.fileName 기준으로 sessionStorage에서 Blob URL을 조회한다.
   *    - UploadPage에서 업로드 직후 sessionStorage.setItem("img:" + fileName, blobUrl)로 저장했던 값이다.
   * 3) Blob URL이 없다면:
   *    - 서버에서 내려준 S3 리사이즈 URL(image.resizedUrl)을 그대로 src에 세팅한다.
   * 4) Blob URL이 있다면:
   *    - 우선 src를 Blob URL로 세팅해서 화면에 즉시 보여준다.
   *    - 이어서 fetch(cached)를 호출하여 Blob URL이 실제로 유효한지 검사한다.
   *      (페이지를 새로고침한 경우, Blob 데이터는 사라지고 깨진 URL 문자열만 남아있을 수 있기 때문)
   *    - fetch가 실패하거나 응답이 정상적이지 않다면:
   *        a) sessionStorage에서 해당 Blob URL을 제거하고
   *        b) src를 image.resizedUrl로 변경하여 S3 리사이즈 이미지를 사용한다.
   */
  useEffect(() => {
    if (!image) return; // 아직 상세 정보가 없으면 아무 것도 하지 않음

    const cached = sessionStorage.getItem("img:" + image.fileName);

    // 1단계: 캐시가 없으면 바로 S3 리사이즈 URL 사용
    if (!cached) {
      setSrc(image.resizedUrl);
      return;
    }

    // 2단계: 캐시(Blob URL)가 있으면 우선 화면에 표시
    setSrc(cached);

    let cancelled = false;

    // 3단계: Blob URL이 실제로 살아 있는지 검증
    fetch(cached)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Blob URL이 없습니다.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Blob URL이 깨졌다면:
        // - sessionStorage에서 제거
        // - src를 리사이즈된 S3 URL로 교체
        sessionStorage.removeItem("img:" + image.fileName);
        setSrc(image.resizedUrl);
      });

    // 컴포넌트 언마운트 시 fetch 결과에 의해 setState가 호출되지 않도록 플래그 처리
    return () => {
      cancelled = true;
    };
  }, [image]);

  // 5. 로딩 중이거나 image 데이터를 아직 못 불러온 상태에 대한 처리
  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      {/**
       * 실제 화면에 표시되는 이미지
       * - src 상태에는 다음 두 가지 중 하나가 들어간다.
       *   1) 업로드 직후 sessionStorage에 저장된 Blob URL (페이지를 새로고침하지 않은 경우)
       *   2) S3에 저장된 리사이즈 이미지 URL(image.resizedUrl)
       * - Blob URL이 더 이상 유효하지 않은 상황(새로고침 등)에서는
       *   useEffect #2에서 자동으로 resizedUrl로 fallback 되도록 처리
       */}
      <img
        src={src}
        alt={image.uuid}
        style={{
          width: 400,
          borderRadius: 8,
          border: "1px solid #ddd",
          marginBottom: 15,
        }}
      />

      {/** 이미지의 메타데이터(파일명, UUID, 업로드 시간)를 표시하는 영역 */}
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

      {/** 목록 화면으로 돌아가기 위한 링크 */}
      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로 돌아가기
      </Link>
    </div>
  );
}