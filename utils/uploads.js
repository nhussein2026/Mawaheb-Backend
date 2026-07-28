const multer = require("multer");
const imageStorage = require("./cloudinary");
const docStorage = require("./cloudinaryDocs");

// Centralised multer instances so controllers stop re-declaring storage +
// fileFilter boilerplate. `uploadImage` = images only (Cloudinary image folder);
// `uploadDoc` = images or PDF up to 5 MB (results, evaluations, attachments).

const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB (spec §9 attachment limit)

const uploadImage = multer({ storage: imageStorage });

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: MAX_DOC_BYTES },
});

module.exports = { uploadImage, uploadDoc, MAX_DOC_BYTES };
