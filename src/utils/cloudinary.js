import { v2 as cloudinary} from 'cloudinary';

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

        console.log('File has been uploaded on cloudinary', uploadResponse.url);
        return uploadResponse;

    } catch (error) {
        fs.unlinkSync(localPath);//remove the file locally
        return null;
    }
}