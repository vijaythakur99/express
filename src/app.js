import express from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

//to use formdata and other json payloads
app.use(express.json({
    limit: '16kb'
}));

//to handle input data coming from encoded params
app.use(express.urlencoded({extended: true}));

//just to create a folder "public" in order to store all the static content
app.use(express.static('public'));

//to handle the cookies
app.use(cookieParser());


//route path (intentionally written in between in b/w)
import userRoute from './routes/user.route.js'

//route register
app.use('/api/v1/users', userRoute);


export { app };