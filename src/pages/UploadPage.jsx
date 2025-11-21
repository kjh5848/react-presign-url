import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { imageApi } from "../api/imageApi";
import { imageStore } from "../store/imageStore";

export default function UploadPage() {
  // 업로드 완료 후 메인 페이지("/")로 이동하기 위해 사용
  const navigate = useNavigate();

  // file 상태: 사용자가 파일 선택 필드에서 고른 실제 파일 객체
  const [file, setFile] = useState(null);

  // preview 상태: 브라우저 메모리에서 생성된 임시 Blob URL(이미지 미리보기용)
  const [preview, setPreview] = useState("");

  /**
   * handleFileChange
   * - 파일 선택 입력 요소에서 파일이 선택될 때 실행됨
   * - e.target.files[0]은 사용자가 선택한 첫 번째 파일(브라우저 File 객체)
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
  };

  /**
   * handleUpload
 * - Spring 서버에 프리사인드 URL 발급 요청
 * - 발급된 URL로 S3에 바로 업로드(HTTP PUT)
 * - 업로드 완료 후 Spring 서버에 데이터베이스 저장 요청
   */
  const handleUpload = async () => {
    if (!file) return alert("파일을 선택하세요.");

    try {
      // 1. Presigned URL 발급 요청
      const res = await imageApi.presign(file.name, file.type);
      const { key, presignedUrl } = res.data;

      // 2. 발급받은 Presigned URL로 S3에 이미지를 HTTP PUT으로 직접 업로드
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("S3 업로드 실패");

      // 3. Spring 서버에 업로드 완료(DB 저장 요청)
      const resData = await imageApi.complete(key, file.name);
      const data = resData.data

      // 4. 요청받은 데이터를 세션 스토어에 등록 (id 기준)
      imageStore.add({
        id: data.id,
        fileName: data.fileName,
        uuid: data.uuid,
        resizedUrl: data.resizedUrl,
        createdAt: data.createdAt,
        previewUrl: preview,
      });

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
