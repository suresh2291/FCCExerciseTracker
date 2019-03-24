/*
IMPORTANT Please Follow the Below Steps
HOW TO START THE PROJECT
1.run the command in console to start mongod server

mongod --dbpath=/app --nojournal


2. use the command in another console to add data into db.
---> mongo
--->use exercise-track
--->show collections// to view c

*/
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortId = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/*
my code start here
*/

var Person = mongoose.model('Person',{
  shortId: {type: String, unique: true, default: shortId.generate},
  username: String,
  exercise: [{
    desc : String,
    duration: Number,
    date : {}
  }]
});

const createPerson = (name, done) => {
  Person.findOne({username:name}, (err,findData)=>{
    if (findData == null){
      //no user currently, make new
      const person = new Person({username : name, exercise : []});
      person.save((err,data)=>{
        if(err){
          done(err);
        }
        done(null , data);
      });
    }else if (err){
      done(err);
    }else{
      //username taken
      done(null,"taken");
    }
  });
};

const addExercise = (personId, activity, done) => {
  Person.findOne({shortId:personId}, (err,data)=>{
    //add to array
    if (data == null){
      done(null,'notFound');
    }else{
      if (data.exercise.length === 0) {
        data.exercise = data.exercise.concat([activity]);
      }else if (data.exercise.date == null){
          data.exercise.splice(0,0,activity);
      }else{
        let mark = 'pending';
        for (let i = 0; i<data.exercise.length; i++){
          if (activity.date < data.exercise[i].date){
            data.exercise.splice(i,0,activity);
            mark = 'done'
            break;
          }
        }
        if (mark === 'pending'){
         data.exercise = data.exercise.concat(activity); 
        }
      }       
      //save
      data.save((err, data) => {
        if (err) {
          console.log(err);
          done(err) 
        } else { 
          done(null, data) 
        }
      });
    }
 });
};

//functions
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

//post requests
app.post('/api/exercise/new-user',(req,res) => {
  createPerson(req.body.username, (err,saveData)=>{
    if(err){
      res.send({error:"Error, Please try again"});
    }else if (saveData === 'taken'){
      res.send({"error":"Username already taken"})
    }else{
      res.send({"username":saveData.username,"id":saveData.shortId});
    }
  });
});

app.post('/api/exercise/add',(req,res) => {
  let dateVar = '';
  if (req.body.date != ''){
    dateVar = new Date(req.body.date); 
  }
  
  let activity = {
    desc : req.body.description,
    duration: req.body.duration,
    date: dateVar
  }
  addExercise(req.body.userId,activity,(err,saveData)=>{
    if(err){
      res.send({error:"Error, Please try again"});
    }else if (saveData === 'notFound'){
      res.send({"error":"User not found"})
    }else{
      res.send({"username":saveData.username,"description":activity.desc,"duration":activity.duration,"id":saveData.shortId,"date":activity.date});
    }
  })
});

//get requests
app.get('/api/exercise/log/:userId',(req,res) => {
  
  Person.findOne({shortId:req.params.userId}, (err,data) =>{
    if (data == null){
      res.send({"error":"User not found"});
    }else{
      let results = data.exercise;
      
      let fromDate = new Date(req.query.from);
      let toDate = new Date(req.query.to);
      let limit = Number(req.query.limit);
      //check if to is defined
      if (isValidDate(toDate)){
        results = results.filter((item) => (item.date >= fromDate && item.date <= toDate));
      //check if just from defined
      }else if(isValidDate(fromDate)){
        results = results.filter((item)=>(item.date >= fromDate))
      }
      //apply limit if defined and applicable
      if (!isNaN(limit) && results.length > limit){
        results = results.slice(0,limit);
      }
      
      res.send({"exercise":results});
    }
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
