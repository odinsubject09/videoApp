import mongoose, { Mongoose } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    // Validate videoId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // Convert page and limit to numbers and validate
    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)
    
    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Page and limit must be positive numbers")
    }

    // Create aggregation pipeline for getting comments with pagination
    const aggregateQuery = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",  // Fixed: was "locaField"
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: {
                createdAt: -1 // Sort by newest first
            }
        }
    ])

    const options = {
        page: pageNumber,
        limit: limitNumber
    }

    try {
        const comments = await Comment.aggregatePaginate(aggregateQuery, options)
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    comments,
                    "Comments fetched successfully"
                )
            )
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching comments")
    }
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId}=req.params
    const {comment}=req.body
    if(!Mongoose.isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid User Id")
    }
    if(!comment||comment.trim()==="")
    {
        throw new ApiError(401,"No comment body")
    }
    if(!req.user?._id)
    {
        throw new ApiError(401,"User not authenticated")
    }
    try
    {
        const comment=await Comment.create(
        {video:Mongoose.Types.ObjectId(videoId),
        comment:comment.trim(),
        owner:req.user._id}
        )

        return res.status(200).json(new ApiResponse(200,comment,"comment added successfully"))

        
    }
    catch(error)
    {
        throw new ApiError(500,error.message)
    }
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // Validate content
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    // Check if user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User not authenticated")
    }

    try {
        // Find the comment first to check ownership
        const comment = await Comment.findById(commentId)
        
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }

        // Check if the user owns this comment
        if (comment.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You can only update your own comments")
        }

        // Update the comment
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                content: content.trim()
            },
            {
                new: true, // Return the updated document
                runValidators: true // Run mongoose validators
            }
        ).populate("owner", "username fullName avatar")
         .populate("video", "title")

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedComment,
                    "Comment updated successfully"
                )
            )

    } catch (error) {
        // Handle specific errors
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(500, "Something went wrong while updating the comment")
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // Check if user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User not authenticated")
    }

    try {
        // Find the comment first to check ownership
        const comment = await Comment.findById(commentId)
        
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }

        // Check if the user owns this comment
        if (comment.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You can only delete your own comments")
        }

        // Delete the comment
        const deletedComment = await Comment.findByIdAndDelete(commentId)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    deletedComment,  // Fixed: was deleteComment (undefined variable)
                    "Comment deleted successfully"
                )
            )

    } catch (error) {
        // Handle specific errors
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(500, "Something went wrong while deleting the comment")
    }
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }