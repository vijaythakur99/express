import express from 'express';

const app = express();

const PORT = 8000;

app.get('/',(req,res)=>{
    console.log(req.url);
    res.send('<h1>Welcome to app</h1>');
});

app.get('/data',(req,res)=>{
    console.log(req.url);
    res.send('Hello world');
})

app.listen(PORT || process.env.PORT);