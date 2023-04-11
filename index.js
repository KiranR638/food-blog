const express = require('express');
const cors = require('cors');
// body parser is used to fetch data from html front end to backend
var body_parser = require('body-parser');
var app = express();
// For uploading files like images
const upload = require('express-fileupload');
app.use(upload());

// database 
const connect_db = require('./connect_db');
connect_db();

//CORS is shorthand for Cross-Origin Resource Sharing. 
//It is a mechanism to allow or restrict requested resources on a web server 
//depend on where the HTTP request was initiated.
app.use(cors());
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:true}));

// models
let User = require('./models/User');
let Post = require('./models/Post');
let Comment = require('./models/Comment');


const path = require('path');
//mongoose is used for connecting mongodb database
const mongoose  = require('mongoose');
const flash = require('express-flash')
// sessions are used for storing sessions like user_id
const sessions = require('express-session')

// Bcrypt is used for hashing password
const bcrypt = require('bcrypt');
// used in password hashing     
const saltRounds = 10;

// for flashing messages
app.use(flash())
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const twoDay = 1000 * 60 * 60 * 48;

app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: twoDay },
    resave: false 
}));

// path for public directory which is often accessed in front end
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', './views');
app.set('view engine', 'hbs');




// Normal User Routes start
//for rendering home page and fetching data from Post collection
app.get('/',isLoggedOut, (req, res) => {
	Post.find().then((posts) => {
        res.render('home', {'posts':posts});
    })
});


//for rendering post_details page and fetching data from Post, user and comment collections and joining them
app.get('/post_details', (req, res) => {
    const user_id = req.session.user_id
    Post.aggregate([
        {
            $match:{
                '_id':new mongoose.Types.ObjectId(req.query.post_id)
            }
            
        },
        {
            $lookup:{
                from:'users',
                localField:'user_id',
                foreignField:'_id',
                as:'post_user'
            }
            
        },

        {
            $lookup:{
                from:'comments',
                localField:'_id',
                foreignField:'post_id',
                as:'comments'
            }
            
        }
    ]).then((post) => {
        const curr_user = user_id == post[0].user_id
        res.render('post_details', {'post':post[0], 'user':post[0].post_user[0], 'comments':post[0].comments, 'curr_user':curr_user, 'user_id':new mongoose.Types.ObjectId(user_id)});
    })
    
    
        
});


//for rendering post page
app.get('/post', (req, res) => {
	res.render('post');
});


// making post and inserting data into database
app.post('/post', (req, res) => {
	const title = req.body.title
	const description = req.body.description
    const user_id = req.session.user_id
    
	const file = req.files.image
	const image_name = file.name

    // mv = move
	file.mv('public/images/'+image_name, function(err){
		if(err){
			res.send(err)
		}
	})

    const date = new Date();

    let new_post = new Post({title:title, description:description, post_image:image_name, user_id:new mongoose.Types.ObjectId(user_id),isAdmin:false, date:`${date.getDate()+10}/${date.getMonth()}/${date.getFullYear()}`})
    new_post.save()
    toast = "Added successfully"


	res.redirect('/')
});

// For inserting data into comment collection
app.post('/add_comment', (req, res) => {
	const comment_content = req.body.comment_content
    const post_id = req.query.post_id
    const user_id = req.session.user_id
    console.log(user_id)

    User.findOne({_id:new mongoose.Types.ObjectId(user_id)}).then((user) => {
        let new_comment = new Comment({comment_content:comment_content, username:user.name, user_id:new mongoose.Types.ObjectId(user_id), post_id:new mongoose.Types.ObjectId(post_id)})
        new_comment.save()
        toast = "Added successfully"


	    return res.redirect('/')
    })
});

app.get('/delete/post', (req, res) => {
    Post.findOneAndDelete({"_id":new mongoose.Types.ObjectId(req.query.post_id)}).then(() => {
        return res.redirect('/');
    })
})

app.get('/delete_comment', (req, res) => {
    Comment.findOneAndDelete({"_id":new mongoose.Types.ObjectId(req.query.comment_id)}).then(() => {
        return res.redirect('/');
    })
})


app.get('/edit_comment', (req, res) => {
    const comment_id = req.query.comment_id

    res.render('edit_comment', {'comment_id':comment_id})
})

app.post('/edit_comment', (req, res) => {
    const comment_id = req.query.comment_id
    const comment_content = req.body.comment_content

    Comment.findById(new mongoose.Types.ObjectId(comment_id)).then(async (comment) => { 
        if(comment){
            let filter = { _id: new mongoose.Types.ObjectId(comment_id) };
            let updateDoc = {
                $set: {
                    "comment_content":comment_content

                }

            }

            await Comment.updateMany(filter,updateDoc)
        }

        return res.redirect('/');
    });
})


// Route for rendering edit_post page
app.get('/update_post', (req, res) => {
	res.render('edit_post', {'post_id':req.query.post_id});
});

// Route for updating post
app.post('/update_post', (req, res) => {
	const title = req.body.title
	const description = req.body.description
    
	const file = req.files.image
	const image_name = file.name

	file.mv('public/images/'+image_name, function(err){
		if(err){
			res.send(err)
		}
	})

    Post.findById(new mongoose.Types.ObjectId(req.query.post_id)).then(async (post) => { 
        if(post){
            let filter = { _id: new mongoose.Types.ObjectId(req.query.post_id) };
            let updateDoc = {
                $set: {
                    "title":title,
                    "description":description,
                    "post_image":image_name,

                }

            }

            await Post.updateMany(filter,updateDoc)
        }

        return res.redirect('/');
    });
});


// Normal User Routes ends


// Admin code starts

// Route for rendering all posts in the posts page of admin
app.get('/admin/posts', (req, res) => {
    Post.find().then((posts) => {
        res.render('admin/posts', {'posts':posts});
    })
})

// Route for rendering post_details page in admin and all data and joining all colllections
app.get('/admin/post_details', (req, res) => {
    Post.aggregate([
        {
            $match:{
                '_id':new mongoose.Types.ObjectId(req.query.post_id)
            }
            
        },
        {
            $lookup:{
                from:'users',
                localField:'user_id',
                foreignField:'_id',
                as:'post_user'
            }
            
        },

        {
            $lookup:{
                from:'comments',
                localField:'_id',
                foreignField:'post_id',
                as:'comments'
            }
            
        }
    ]).then((post) => {
        console.log(post[0].comments)
        res.render('admin/post_details', {'post':post[0], 'user':post[0].post_user[0], 'comments':post[0].comments});
    })
    
    
        
});

// Route for rendering edit_post page
app.get('/admin/update_post', (req, res) => {
	res.render('admin/edit_post', {'post_id':req.query.post_id});
});

// Route for updating post
app.post('/admin/update_post', (req, res) => {
	const title = req.body.title
	const description = req.body.description
    
	const file = req.files.image
	const image_name = file.name

	file.mv('public/images/'+image_name, function(err){
		if(err){
			res.send(err)
		}
	})

    Post.findById(new mongoose.Types.ObjectId(req.query.post_id)).then(async (post) => { 
        if(post){
            let filter = { _id: new mongoose.Types.ObjectId(req.query.post_id) };
            let updateDoc = {
                $set: {
                    "title":title,
                    "description":description,
                    "post_image":image_name,

                }

            }

            await Post.updateMany(filter,updateDoc)
        }

        return res.redirect('/admin/posts');
    });
});



// Route for deleting post 
// req.query.post_id is used for accessig the id of post which is sent from post details page while calling the api
app.get('/delete/post', (req, res) => {
    Post.findOneAndDelete({"_id":mongoose.Types.ObjectId(req.query.post_id)}).then(() => {
        return res.redirect('/admin/posts');
    })
})

// Route for deleting the comment
// req.query.comment_id is used for accessig the id of comment which is sent from post details page while calling the api
app.get('/comment/delete', (req, res) => {
    Comment.findOneAndDelete({"_id":req.query.comment_id}).then(() => {
        return res.redirect('/admin/posts');
    })
})

// making post and inserting data into database
app.post('/admin/add_post', (req, res) => {
	const title = req.body.title
	const description = req.body.description
    const user_id = req.session.user_id
    
	const file = req.files.image
	const image_name = file.name

    // mv = move
	file.mv('public/images/'+image_name, function(err){
		if(err){
			res.send(err)
		}
	})

    let new_post = new Post({title:title, description:description, post_image:image_name, user_id:new mongoose.Types.ObjectId(user_id),isAdmin:true, date:new Date().toISOString()})
    new_post.save()
    toast = "Added successfully"


	res.redirect('/admin/posts')
});

//for rendering admin add_post page
app.get('/admin/add_post', (req, res) => {
	res.render('admin/add_post');
});


//Admin code ends

// Route for rendering register page
app.get('/register',isLoggedIn, (req, res) => {
   
    res.render('register',{showToast:false});
})

// Route for registering new user
app.post("/register",isLoggedIn,(req,res)=>{
	let hash_password;
    let email = req.body.email;
   
    let password = req.body.password;
    let name = req.body.name;
    console.log(name)
	bcrypt.hash(password,saltRounds,(err,hash)=>{
		hash_password = hash

		let toast = ""
    	var user = User.findOne({ email: email});
    	if(user.size>0){
         toast = "Email Already Exists! Please try another one";
         res.render("register",{showToast:true,toast:toast})

    	}else{
        	let new_user= new User({name:name, email: email, password:hash_password,})
        	new_user.save()
       
        	toast = "Registered successfully"
        
        	res.render("register",{showToast:true,toast:toast})
       
        
    	}
	})
    

})

// Route for rendering login page
app.get('/login',isLoggedIn,(req, res) => {
	res.render('login');
});

// Route for logging in user
app.post("/login",isLoggedIn,(req,res)=>{
    let toast = ""
    let email = req.body.email
    let password = req.body.password

    // email and passwor for admin
    if(email == "admin@gmail.com" && password == "admin1234"){
        return res.redirect('/admin/posts');
    }else{
        User.findOne({ email: email})
    .then(user=>{
       
        if(user != null){
			bcrypt.compare(password, user.password, function(error, response) {
				if(response == true){
					let session = req.session
            		session.user_id = user.id
            		console.log(session)
            		toast = "Logged in successfully"
            		return res.redirect('/');
				}else{
					toast = "Incorrect email or password"
				}

			})
    
        }else{
             toast = "Incorrect email or password"
            return res.render('login',{showToast:true,toast:toast});
             
           
    
        }


    })
    }
  
    
   

});

// Route for logout
app.get("/logout",(req,res)=>{
    req.session.destroy()
    return res.redirect("/login")
})

// functiion for knowing wether a person is logged in or not
// if the person is logged in then there will be user_id in the session 
// and the user will be redirected to home page
function isLoggedIn(req,res,next){
    let session = req.session
    if(session.user_id){
        return res.redirect("/")
    }else{
        return next()

    }
}

// functiion for knowing wether a person is logged in or not
// if the person is not logged in then there will be not be user_id in the session 
// and the user will be redirected to login page
function isLoggedOut(req,res,next){
    let session = req.session
    if(session.user_id){
        return  next()
    }else{
        return res.redirect("/login")

    }
}


// using port 5000
app.listen(process.env.PORT||5000);
    //console.log('Server is running on port 5000');