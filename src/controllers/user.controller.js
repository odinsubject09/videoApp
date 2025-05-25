import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"

const generateAccessTokenAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error)
    {
        throw new ApiError(500,error.message,"something went wrong ,could not generate access and refresh token")
    }
}

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
        [fullName,email,username,password].some((field)=>
            field?.trim()==="")
    )
    {
        throw new ApiError(400,"all fields required")
    }

    const existedUser=await User.findOne(
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
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
      let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if(!avatarLocalPath)
    {
        throw new ApiError(400,'Avatar file is required')
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    
    console.log("coverImage right before DB insert:", coverImage);
    console.log("coverImage.url:", coverImage?.url);
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

    const userCreated=await User.findById(user._id).select(
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

const loginUser=asyncHandler(async (req,res)=>{
    /*
        1.data from req.body
        2.check if username or email present
        3.then check password
        4.if password correct then generate access token and refresh token
        5.send cookies
    */

    const {username,email,password}=req.body
    if(!username&&!email)
    {
        throw new ApiError(400,"username or email required")
    }

    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(404,"user does not exist")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid)
    {
        throw new ApiError(401,"Wrong password")
    }
    const{refreshToken,accessToken}=await generateAccessTokenAndRefreshToken(user._id)
    
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            }
        )
    )
})

const logoutUser=asyncHandler(async (req,res)=>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>
    {
    const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken
    
    if(!incomingRefreshToken)
    {
        throw new ApiError(401,'UnAuthorised Request')
    }
    try{
            const decodedToken=jwt.verify(incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET)
            
            const user=User.findById(decodedToken?._id)

            if(!user)
            {
                throw new ApiError(401,"invalid refresh Token")
            }

            if(incomingRefreshToken!==user.refreshToken)
            {
                throw new ApiError(401,"Refresh token is expired or used")
            }

            const options={
                httpOnly: true,
                secure: true
            }
            const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
            
                return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        200, 
                        {accessToken, refreshToken: newRefreshToken},
                        "Access token refreshed"
                    )
                )
    }
    catch(error)
    {
        throw new ApiError(401,error?.message)
    }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}