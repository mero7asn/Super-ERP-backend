const multer = require('multer');
const path = require('path');

const govDocFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png|gif|webp|doc|docx/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = /pdf|jpeg|jpg|png|gif|webp|msword|officedocument/.test(file.mimetype);
  if (extOk || mimeOk) cb(null, true);
  else cb(new Error('Only PDF, image, or Word document files are allowed'));
};

const govDocStorage = multer.memoryStorage();
const signedContractStorage = multer.memoryStorage();

const uploadGovDoc = multer({ storage: govDocStorage, fileFilter: govDocFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSignedContract = multer({ storage: signedContractStorage, fileFilter: govDocFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = uploadGovDoc;
module.exports.uploadSignedContract = uploadSignedContract;
