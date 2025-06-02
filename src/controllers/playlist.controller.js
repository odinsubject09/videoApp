import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => 
    {
    const {name, description} = req.body
    const playlistCreated=await Playlist.create(
        {
            name,
            description,
            owner:req.user?._id
        }
    )
    return res.status(200).json(new ApiResponse(200,playlistCreated,"created playlist"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const playlists = await Playlist.aggregate([
        {
            $match: 
            {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {$project:{
                        title:1,
                        description:1,
                        duration:1
                    }}
                ]
            }
        },
        {
            $project: {
                id:0,
                name: 1,
                description: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    return res.status(200).json({
        success: true,
        data: playlists,
        message: "Playlists retrieved successfully"
    });
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID");
    }

    const playlistUpdate = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId }
        },
        { new: true }
    );

    if (!playlistUpdate) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.status(200).json(new ApiResponse(200, playlistUpdate, "Updated playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => 
    {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    
    if (!deletedPlaylist) {
        return res.status(404).json({
            success: false,
            message: "Playlist not found"
        });
    }
    
    return res.status(200).json({
        success: true,
        message: "Playlist deleted successfully"
    });
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    try
    {
        const playlist=await Playlist.findByIdAndUpdate(playlistId,
        {
            name:name,
            description:description
        }
        )
        return res.status(200).json(new ApiResponse(200,playlist,"playlist created"))
    }
    catch(error)
    {
        throw new ApiError(500,"could not create playlist")
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}