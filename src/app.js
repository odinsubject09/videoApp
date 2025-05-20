import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'


const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({
    limit: '20kb'
}))//json config

app.use(express.urlencoded())//url config
app.use(express.static('public'))//to store static data in our own server
app.use(cookieParser())//to parse cookies

export {app}
