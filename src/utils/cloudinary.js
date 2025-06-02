import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import { ApiError } from './ApiError.js';

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

function getPublicIdFromUrl(url) {
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return null;

  const relevantParts = parts.slice(uploadIndex + 1);

  // Remove version like v123456789
  if (/^v\d+$/.test(relevantParts[0])) {
    relevantParts.shift();
  }

  const filePath = relevantParts.join('/');
  return filePath.replace(/\.[^/.]+$/, ''); // remove file extension
}

const deleteFromCloudinary = async (url) => {
  try {
    const public_id = getPublicIdFromUrl(url);
    if (!public_id) {
      throw new ApiError(400,'Invalid Cloudinary URL or public_id could not be extracted');
    }

    const result = await cloudinary.uploader.destroy(public_id);
    console.log('Deletion result:', result);
    return result;
  } 
  catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new ApiError(500, "Could not delete URL");
  }
}

const uploadOnCloudinary=async(filePath)=>
{
    try
    {
        if(!filePath)
        {
            return null
        }
        const response=await cloudinary.uploader.upload(filePath,{
            resource_type:'auto',
        })
        //console.log('file is uploaded on cloudinary',response.url)
        fs.unlinkSync(filePath)
        return response;

    }
    catch(error)
    {
        fs.unlinkSync(filePath)
        return null
    }
}


export {uploadOnCloudinary,
        deleteFromCloudinary}