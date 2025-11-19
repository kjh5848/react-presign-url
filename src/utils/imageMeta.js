const STORAGE_KEY = "imageMeta";

const read = () => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const write = (list) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const applyUpdate = (meta, update) => {
  if (typeof update === "function") {
    const result = update(meta);
    return result == null ? meta : result;
  }
  return { ...meta, ...update };
};

export const imageMetaStore = {
  all(options = {}) {
    const { includePending = true } = options;
    const list = read();
    return includePending ? list : list.filter((meta) => !meta.pending);
  },

  find(fileName) {
    return read().find((m) => m.fileName === fileName) || null;
  },

  upsert(meta) {
    const list = read().filter((m) => m.fileName !== meta.fileName);
    list.push(meta);
    write(list);
    return meta;
  },

  update(fileName, patch) {
    const list = read();
    const updated = list.map((meta) =>
      meta.fileName === fileName ? applyUpdate(meta, patch) : meta
    );
    write(updated);
    return updated.find((m) => m.fileName === fileName) || null;
  },

  clearPreview(fileName) {
    const list = read().map((m) =>
      m.fileName === fileName ? { ...m, previewUrl: null } : m
    );
    write(list);
  },
};
