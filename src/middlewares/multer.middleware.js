import multer from "multer";

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/temp');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now();

        cb(null, file.originalname + '-' + uniqueSuffix);
    }
});

// Create the multer instance
export const upload = multer({ 
    storage
});