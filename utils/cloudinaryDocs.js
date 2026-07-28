const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Document/attachment storage for the Institute Portal — accepts images AND
// PDFs (results, evaluation reports, correspondence attachments, behavior/
// achievement files). Unlike utils/cloudinary.js it uses `resource_type: auto`
// and applies no 500x500 image transform, so PDFs are stored intact.
const docStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "mawaheb/institute/",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  },
});

module.exports = docStorage;
