import mongoose,{Schema} from mongoose
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        lowercase:true,
        index:true
    },
    avatar:{
        type:String,//cloudinary url
        required:true,

    },
    coverimage:{
        type:String,//cloudinary url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:'Video'
        }
    ],
    password:{
        type:String,
        required:[true,'Password is required'],

    },
    refreshToken:{
        type:String,
        required:true
    }


},{timestamps:true})

userSchema.pre('save',async function(next)
{
    if(!this.isModified("password"))
    {
        return next()
    }
    this.password=bcrypt.hash(this.password,10)
    next()//pass on the flag

})//just before saving in DB

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)

}

userSchema.methods.generateAccessToken=function(){
    jwt.sign(
        {
            _id:this._id,
            username:this.username,
            email:this.email,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongooose.model('User',userSchema)
