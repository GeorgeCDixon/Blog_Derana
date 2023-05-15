const express =require('express');
const cors =require('cors');
const { default: mongoose, models } = require('mongoose');
const User =require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app =express();
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs =require('fs');
require('dotenv').config();


var salt = bcrypt.genSaltSync(10);
const secret = "kaputashittheplane";

app.use(cors({credentials:true, origin: 'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+ '/uploads'));


mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB, { useNewUrlParser: true });




app.post('/register', async (req,res)=>{
    const {username, password} =req.body;
    try{
        const userDoc= await User.create({
            username,
            password:bcrypt.hashSync(password,salt)
        });
    res.json(userDoc);

    }catch(exc){
        res.status(400).json(exc);
    }
    
  
});

app.post("/login",async(req, res)=>{
    const {username, password} = req.body;
    const userDoc= await User.findOne({username});
    const passwordCorrect= bcrypt.compareSync(password, userDoc.password);
   if(passwordCorrect){
    //logged in
    jwt.sign({username, id:userDoc.id},secret,{},(err, token) => {
        if(err) throw err;
        res.cookie('token', token).json({
           id:userDoc._id,
           username,
        });
    });


   }else{
    res.status(400).json("wrong Credentials");
   }
});

app.get('/profile', (req,res) =>{
    const {token} =req.cookies;
    jwt.verify(token, secret, {}, (err, info) =>{
        if(err) throw err;
        res.json(info);
    });
});


app.post('/logout', (req, res)=>{
   res.cookie('token', '').json('ok'); 
})

app.post('/post', upload.single('file'), async (req, res)=>{

    const {originalname, path} =req.file;
    const parts = originalname.split('.');
    const ext =parts[parts.length-1];
    const newPath= path+'.'+ext;
    fs.renameSync(path, newPath );


    const {token} =req.cookies;
    jwt.verify(token, secret, {}, async(err, info) =>{
        if(err) throw err;

     const {title, summary, content} =req.body;
     const postDoc = await Post.create({
        title,
        summary,
        content,
        cover:newPath,
        author: info.id
    });
        res.json(postDoc);
    });
 
});


app.put('/post', upload.single('file'), async(req,res) =>{
    let newPath =null;
    if(req.file){
    const {originalname, path} =req.file;
    const parts = originalname.split('.');
    const ext =parts[parts.length-1];
    const newPath= path+'.'+ext;
    fs.renameSync(path, newPath );
    }

    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async(err, info) =>{
    if(err) throw err;
        const {id, title, summary, content} =req.body;
        const postDoc = await Post.findById(id);
        const isAuthor =JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
            return res.status(400).json('You Are Not Authorized User')
            
        }
        await postDoc.updateOne({
            
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover

        });
 
        res.json(postDoc);
    });

});





app.get('/post', async(req, res)=>{
    const posts = await Post.find().populate('author', ['username']).sort({createdAt:-1}).limit(20);
    res.json(posts);
});



app.get('/post/:id', async (req, res) =>{
   const {id} =req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
})



app.delete('/post/:id',async (req,res)=>{
    const {id} =req.params;
    try{
        const results = await Post.findByIdAndDelete(id);
        res.send(results);
      
    }catch(err){
        console.log(err);
    }
    
});

app.listen(4000);

//mongodb+srv://DixonC:Ghnb$$5270@cluster0.6nt3mnn.mongodb.net/?retryWrites=true&w=majority