import { v2 as cloudinary} from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET_KEY 
});

const uploadOnCloudinary = async (localPath) => {
    try {
        if(!localPath) {
            return null;
        }
        const uploadResponse = await cloudinary.uploader.upload(
            localPath,
            {
                resource_type: 'auto'
            }
        );

        fs.unlinkSync(localPath);
        return uploadResponse;

    } catch (error) {
        fs.unlinkSync(localPath);//remove the file locally
        return null;
    }
};

const deleteFromCloudinary = async (imagePublicUrl) => {
    try {
        if(!imagePublicUrl) {
            return false;
        }

        const publicId = extractPublicId(imagePublicUrl);

        if(!publicId) {
            return false;
        }

        const res = await cloudinary.uploader.destroy(publicId);

        return res ? res?.result === "ok" : false;

    } catch (error) {
        return false;
    }
}

// Function to extract public ID from public URL
function extractPublicId(cloudinaryUrl) {
    const publicIdMatches = cloudinaryUrl.match(/\/v\d+\/([^/]+)\.\w+$/);

    if (publicIdMatches && publicIdMatches.length > 1) {
        return publicIdMatches[1];
    } else {
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };