import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function UploadPage() {
  // 업로드 완료 후 메인 페이지("/")로 이동하기 위해 사용
  const navigate = useNavigate();

  // file: 사용자가 input에서 선택한 실제 파일 객체(File 타입)
  const [file, setFile] = useState(null);

  // preview: 브라우저 메모리에서 생성된 임시 Blob URL(이미지 미리보기용)
  const [preview, setPreview] = useState("");

  /**
   * handleFileChange
   * - input type="file" 에서 파일이 선택될 때 실행됨
   * - e.target.files[0]은 사용자가 선택한 첫 번째 파일(File 객체)
   * - URL.createObjectURL:
   *     브라우저가 파일 객체를 읽어 Blob URL을 생성하는 기능
   *     서버에 파일을 업로드하지 않아도 브라우저 메모리에서 즉시 미리보기 가능
   */
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);

    // 브라우저가 파일 객체로 임시 Blob URL을 생성하여 즉시 미리보기 가능하게 함
    const previewUrl = URL.createObjectURL(f);
    setPreview(previewUrl);

    // 업로드 직후 목록/상세 화면에서 즉시 표시하기 위해 Blob URL을 sessionStorage에 저장
    // 새로고침 시 Blob 데이터는 사라지지만 이후 페이지에서 유효성 검사 후 자동 fallback 처리됨
    sessionStorage.setItem("img:" + f.name, previewUrl);

    // --- 업로드된 파일 정보를 클라이언트 전용 목록(B 모드)으로 sessionStorage에 저장 ---
    let metaList = JSON.parse(sessionStorage.getItem("imageMeta"));
    const meta = {
      fileName: f.name,
      previewUrl: previewUrl,
      createdAt: Date.now(),
    };
    metaList.push(meta);
    sessionStorage.setItem("imageMeta", JSON.stringify(metaList));
  };

  /**
   * handleUpload
   * - Spring 서버에 Presigned URL 발급 요청
   * - 발급된 URL로 S3에 직접 PUT 업로드
   * - 업로드 완료 후 Spring 서버에 DB 저장 요청
   */
  const handleUpload = async () => {
    if (!file) return alert("파일을 선택하세요.");

    try {
      // 1. Presigned URL 발급 요청
      const res = await imageApi.presign(file.name, file.type);
      const { key, presignedUrl } = res.data;

      // 2. 발급받은 presigned URL로 S3에 이미지 직접 업로드
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("S3 업로드 실패");

      // 3. Spring 서버에 업로드 완료(DB 저장 요청)
      await imageApi.complete(key, file.name);

      alert("업로드 완료!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("업로드 실패!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>업로드 페이지</h2>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {preview && (
        <img
          style={{ width: 500, height: 500, marginTop: 20 }}
          src={preview}
          alt="preview"
        />
      )}

      <br />
      <button onClick={handleUpload} style={{ marginTop: 20, width: 200 }}>
        업로드
      </button>
    </div>
  );
}