const STORAGE_KEY = "imageStore";

// sessionStorage 읽기
const read = () => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// sessionStorage 쓰기
const write = (list) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const imageStore = {
  // 전체 조회
  getAll() {
    return read();
  },

  // id로 찾기
  find(id) {
    return read().find((m) => m.id === id) || null;
  },

  // 서버 complete() 이후 저장
  add(newImage) {
    const update = read().filter((img) => img.id !== newImage.id);
    update.push(newImage);
    write(update);
  },

  // 서버 목록을 그대로 저장 (새 세션 초기화용)
  setAll(list) {
    write(list);
  },
};
