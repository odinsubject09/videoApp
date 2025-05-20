
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}
export {asyncHandler}
// const asyncHandler=(fn)=>async(req,res,next)=>{
//     try 
//     {
//         await fn(req,res,next)
//     } 
//     catch (error) 
//     {
//         console.log('error in asyncHandler',error)
//         res.status(error.status || 500).json({
//             status: 'error',
//             sucess: false,
//             message: error.message || 'Internal Server Error'
//         })
//     }
// }

