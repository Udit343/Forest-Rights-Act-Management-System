import multer from "multer";
import path from "path";

const storage=multer.diskStorage({
      destination:"uploads/",
      filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${Math.random()}${path.extname(file.originalname)}`
    );
  },
})

const upload=multer({
    storage,
    limits:{fileSize: 10 * 1024 * 1024},
})

export default upload;
