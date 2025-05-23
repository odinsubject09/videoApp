import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser=asyncHandler(async (req,res)=>{
    /*1.get user details from frontend
    2.check if all fields filled
    3.check if user already present-username
    4.upload image,avatar to multer->cloudinary
    5.create user object upload to DB
    6.response returned to user don not return passwrod refresh token
    7.check for user creation
    8.return response
      
    */
    const {username,fullName,password,email}=req.body

    if(
        [fullname,email,username,password].some((field)=>
            field?.trime()==="")
    )
    {
        throw new ApiError(400,"all fields required")
    }

    const existedUser=User.findOne(
        {
            $or:[{email},{username}]
        }
    )

    if(existedUser)
    {
        throw new ApiError(409,'email or username already present')
    }
    console.log(req.files)
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400,'Avatar file is required')
    }

    const avatar=uploadOnCloudinary(avatarLocalPath)
    const coverImage=uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,'Avatar file is required')
    }

    const user= await User.create(
        {
            fullName,
            email,
            password,
            username:username.toLowerCase(),
            avatar:avatar.url,
            coverImage:coverImage?.url||""
        }
    )

    const userCreated=await User.findById(use._id).select(
        "-password -refreshToken"
    ) 

    if(!userCreated)
    {
        throw new ApiError(500,'something went wrong ,could not create user')
    }

    res.status(200).json(
            new ApiResponse(201,userCreated,"user Created")
    )
})

export {registerUser}