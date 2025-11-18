import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { imageApi } from "../api/imageApi";

export default function UploadPage() {
  // navigate 함수: 업로드 후 "/" 페이지로 이동하기 위해 사용
  const navigate = useNavigate();

  // file: 실제 사용자가 선택한 파일 객체(File 타입)
  const [file, setFile] = useState(null);

  // preview: 선택한 이미지를 화면에 보여주기 위한 Blob URL
  const [preview, setPreview] = useState("");
  

  /**
   * handleFileChange
   * - input type="file" 에서 파일이 선택되면 실행되는 함수
   * - e.target.files[0]는 사용자가 선택한 첫 번째 파일(File 객체)
   * - URL.createObjectURL: 브라우저가 제공하는 Blob(Binary Large Object, 브라우저 객체 타입)URL 생성 API로,
   *   실제 파일 내용을 서버에 보내지 않아도 화면에서 즉시 미리보기 가능
   */
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);

    // 브라우저가 메모리에 임시 URL을 생성해 이미지 미리보기 가능
    // 이 URL은 실제 파일이 아니라 Blob을 가리키는 임시 경로
    const previewUrl = URL.createObjectURL(f);
    setPreview(previewUrl);
    // 업로드 직후 화면에서 즉시 사용하기 위해 Blob URL을 sessionStorage에 저장
    // 새로고침하면 Blob 데이터는 사라지지만 ListPage, DateilPage에서 유효성 검사로 자동 fallback 처리되어 리사이즈 URL을 사용
    sessionStorage.setItem("img:" + f.name, previewUrl);
  };

  /**
   * handleUpload
   * - presign 요청 후 S3에 직접 업로드
   */
  const handleUpload = async () => {
    if (!file) return alert("파일을 선택하세요.");
    try {
      // 1. Presigned URL 요청
      const res = await imageApi.presign(file.name, file.type);
      const { key, presignedUrl } = res.data;

      // 2. S3에 직접 업로드
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("S3 업로드 실패");

      // 3. 스프링에 DB 저장 요청
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