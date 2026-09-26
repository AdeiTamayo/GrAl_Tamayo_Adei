const multer = require('multer');
const path = require('path');

const uploadsDir = path.join(__dirname, '../media/uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const VIDEO_MIMETYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
];

function fileFilter(req, file, cb) {
    if (VIDEO_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only video files are allowed (mp4, mpeg, mov, avi, mkv, webm)'), false);
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 },
});

module.exports = upload;
