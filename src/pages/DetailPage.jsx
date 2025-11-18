import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function DetailPage() {
  /**
   * 라우터 매핑 규칙
   * - /detail/:id           → { id: "3" }
   * - /detail/file/:value   → { value: "abc.png" }
   *
   * 따라서:
   * - value 가 있으면: 파일명 기반(로컬/캐시 모드)
   * - id 가 있으면:     서버 PK 기반(서버 모드)
   */
  const { id, value } = useParams();

  const [image, setImage] = useState(null);
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * sessionStorage에 저장된 imageMeta 배열을 안전하게 로드하는 함수
   * - JSON.parse(null) 예외 방지
   */
  const loadMetaList = () => {
    const raw = sessionStorage.getItem("imageMeta");
    return raw ? JSON.parse(raw) : [];
  };

  /**
   * 1단계: 상세 정보(메타데이터) 결정
   *
   * - value 가 존재 → /detail/file/:fileName 으로 들어온 경우
   *    → 클라이언트 캐시(imageMeta)에서 먼저 찾고, 없으면 서버 list()에서 파일명으로 검색
   *
   * - value 가 없고 id 가 존재 → /detail/:id 로 들어온 경우
   *    → 서버 detail(id)로 조회
   *
   * - 둘 다 없으면 → 잘못된 경로이므로 image=null 처리
   */
  useEffect(() => {
    const load = async () => {
      const metaList = loadMetaList();

      // -------- 1) 파일명 기반 로컬/캐시 모드 (/detail/file/:fileName) --------
      if (value) {
        const localMeta = metaList.find((m) => m.fileName === value);

        // (1) sessionStorage에 저장된 메타데이터가 있으면 그걸로 상세 구성
        if (localMeta) {
          setImage({
            id: "local",                  // 클라이언트 전용 식별자
            fileName: localMeta.fileName, // 파일명
            uuid: null,
            resizedUrl: null,             // 아직 서버 리사이즈 URL 모름
            createdAt: localMeta.createdAt,
          });
          setLoading(false);
          return;
        }

        // (2) 로컬 메타가 없다면 서버 목록에서 파일명으로 검색(previewUrl이 없을 때 서버 상세를 다시 조회하도록 설계됨)
        try {
          const listRes = await imageApi.list();
          const match = listRes.data.find((i) => i.fileName === value);

          if (match) {
            setImage(match); // 서버에서 찾은 DTO 그대로 사용
          } else {
            setImage(null);
          }
        } catch (e) {
          console.error("서버 목록 조회 실패:", e);
          setImage(null);
        }
        setLoading(false);
        return;
      }

      // -------- 2) id 기반 서버 모드 (/detail/:id) --------
      if (id) {
        try {
          const res = await imageApi.detail(id);
          setImage(res.data);
        } catch (err) {
          console.error("상세 조회 실패:", err);
          setImage(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      // -------- 3) id, value 둘 다 없는 잘못된 요청 --------
      setImage(null);
      setLoading(false);
    };

    load();
  }, [id, value]);

  /**
   * 2단계: 실제 <img src=...> 에 넣을 이미지 주소 결정
   *
   * - 우선순위
   *   1) sessionStorage.imageMeta 의 previewUrl(Blob) 이 있으면 그걸 먼저 사용
   *      - 새로고침으로 Blob이 죽었을 수 있으므로 fetch로 유효성 검사
   *      - 깨졌으면 previewUrl을 제거하고 서버 resizedUrl로 대체
   *
   *   2) previewUrl 이 없으면 서버 resizedUrl 사용
   */
  useEffect(() => {
    if (!image) return;

    const metaList = loadMetaList();
    const meta = metaList.find((m) => m.fileName === image.fileName);
    const previewUrl = meta?.previewUrl ?? null;
    console.log("sdfsdf", `${previewUrl}`);

    // -------- 1) previewUrl(Blob)이 있는 경우: 즉시 사용 + 유효성 검사 --------
    if (previewUrl) {
      setSrc(previewUrl);

      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error("invalid blob");
        })
        .catch(async () => {
          // Blob이 이미 사라졌으므로 previewUrl 제거
          const updated = metaList.map((m) =>
            m.fileName === image.fileName ? { ...m, previewUrl: null } : m
          );
          sessionStorage.setItem("imageMeta", JSON.stringify(updated));

          // ---- 대체 경로: 서버에서 resizedUrl 다시 얻기 ----
          // (1) 서버 모드: id가 실제 PK 인 경우 → detail(id) 재호출
          if (image.id !== "local" && image.id != null) {
            try {
              const res = await imageApi.detail(image.id);
              setSrc(res.data.resizedUrl);
            } catch (e) {
              console.error("fallback detail 불가:", e);
            }
          } else {
            // (2) 로컬 모드: 파일명으로 서버 list()에서 검색
            try {
              const listRes = await imageApi.list();
              const match = listRes.data.find(
                (i) => i.fileName === image.fileName
              );
              if (match) setSrc(match.resizedUrl);
            } catch (e) {
              console.error("fallback list 실패:", e);
            }
          }
        });

      return;
    }

    // -------- 2) previewUrl 이 없는 경우: 서버 resizedUrl 바로 사용 --------
    if (!previewUrl) {
      (async () => {
        const listRes = await imageApi.list();
        const match = listRes.data.find(i => i.fileName === image.fileName);
        if (match) setSrc(match.resizedUrl);
        return;
      })();
    }
  }, [image]);

  // 로딩 중 표시
  if (loading) return <p style={{ padding: 20 }}>로딩 중...</p>;

  // image 자체를 못찾은 경우
  if (!image) return <p style={{ padding: 20 }}>이미지를 찾을 수 없습니다.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 상세보기</h2>

      <img
        src={src}
        alt={image.fileName}
        style={{
          width: 420,
          height: 420,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #ccc",
          marginBottom: 20,
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
          <strong>업로드 시각:</strong>{" "}
          {new Date(image.createdAt).toLocaleString()}
        </p>
      </div>

      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        ← 목록으로
      </Link>
    </div>
  );
}
