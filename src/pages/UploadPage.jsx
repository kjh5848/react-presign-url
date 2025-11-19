import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { imageApi } from "../api/imageApi";
import { imageMetaStore } from "../utils/imageMetaStore";

/**
 * UploadPage (localStorage 최종 버전)
 * --------------------------------------------------------------
 * 핵심 흐름
 * 1) 파일 선택 → Blob preview 생성 + localStorage에 임시 저장
 * 2) presign → S3 PUT 업로드
 * 3) complete() → 서버 id/uuid/resizedUrl/originalUrl/createdAt 수신
 * 4) preview + 서버 메타를 localStorage에 upsert
 * 5) 상세 페이지로 이동 (/detail/:id)
 *
 * preview(blob)은 새로고침 시 자연스럽게 invalid가 되고
 * usePreviewSource 훅이 자동으로 fallback(resizedUrl)로 전환한다.
 * --------------------------------------------------------------
 */

export default function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  /**
   * 파일 선택 → preview(blob) 생성 + localStorage 임시 저장
   * ----------------------------------------------------------------
   * 아직 서버 id/uuid가 없기 때문에 id=null, uuid=null 상태로 저장된다.
   * complete() 이후 서버 메타가 upsert로 덮어씌워진다.
   */
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);

    // Blob URL 생성 (React 메모리)
    const previewUrl = URL.createObjectURL(f);
    setPreview(previewUrl);
  };

  /**
   * 업로드 버튼 클릭 → presign → S3 → complete
   * ----------------------------------------------------------------
   * presignedUrl 얻은 뒤 S3에 직접 PUT 업로드하고
   * complete()을 호출하면 서버가 DB에 저장 후 id/uuid/URL을 반환한다.
   * 그 데이터를 로컬스토리지에 upsert로 통합한다.
   */
  const handleUpload = async () => {
    if (!file) return alert("파일을 선택하세요.");

    try {
      // 1) presign 발급
      const presignRes = await imageApi.presign(file.name, file.type);
      const { key, presignedUrl } = presignRes.data;

      // 2) S3 업로드
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("S3 업로드 실패");
      }

      // 3) complete() → 서버 DB 저장 + 이미지 메타 반환
      const completeRes = await imageApi.complete(key, file.name);
      const meta = completeRes.data;

      /**
       * complete 응답(meta):
       * {
       *   id: number,
       *   uuid: string,
       *   fileName: string,
       *   originalUrl: string,
       *   resizedUrl: string,
       *   createdAt: string
       * }
       */

      // 4) 로컬스토리지에 preview + 서버 metadata 합쳐 저장
      imageMetaStore.upsert({
        id: meta.id,
        uuid: meta.uuid,
        fileName: meta.fileName,
        previewUrl: preview,        // blob preview 유지
        createdAt: meta.createdAt,  // 서버 시각으로 통일
        originalUrl: meta.originalUrl,
        resizedUrl: meta.resizedUrl,
      });

      alert("업로드 완료!");
      navigate("/"); // 목록 페이지로 이동

    } catch (err) {
      console.error("업로드 오류:", err);
      alert("업로드 실패!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>이미지 업로드</h2>

      {/* 파일 선택 */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* 업로드 전 프리뷰 */}
      {preview && (
        <img
          src={preview}
          alt="preview"
          style={{
            width: 480,
            height: 480,
            marginTop: 20,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
      )}

      {/* 업로드 버튼 */}
      <br />
      <button
        onClick={handleUpload}
        style={{ marginTop: 20, width: 200 }}
      >
        업로드
      </button>
    </div>
  );
}