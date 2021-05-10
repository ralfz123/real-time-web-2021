const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;

// const { getData, getRecipeData } = require('./modules/data/fetch.js');

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./modules/utils/users.js');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render('index.ejs');
});

// let chatMessages = [];

// app.get('/match/:id', async function (req, res) {
//   let data = await getRecipeData(req.params.id);
//   console.log(data);
//   res.render('pages/match.ejs', { data: data[0] });
// });

// app.get('/login', function (req, res) {
//   res.render('pages/login.ejs');
// });

// app.post('/login', async function (req, res) {
//   res.redirect('/');
// });

// app.get('/room', function (req, res) {
//   res.render('pages/room.ejs');
// });

// app.get('/register', function (req, res) {
//   res.render('pages/register.ejs');
// });

// app.post('/register', async function (req, res) {
//   res.redirect('/login');
// });

const rooms = ['tasty', 'crazy', 'fast', 'delicious', 'flowerpower'];

io.on('connection', (socket) => {
  console.log('user connected');
  socket.emit('welcome', 'Hello welcome to Cooking on Remote!');

  socket.on('joinRoom', ({ room, user }) => {
    const newUser = userJoin(socket.id, user, room);

    socket.join(newUser.room);

    // welcome msg to every new user individually
    // socket.emit(
    //   'message',
    //   formatMessage(botName, 'Welcome at the Cooking On Remote application!!')
    // );

    if (rooms.includes(room)) {
      socket.join(room);
      // io.in(room).emit('newUser', user);
      io.in(newUser.room).emit('roomUsers', {
        room: newUser.room,
        users: getRoomUsers(newUser.room),
      });
      return socket.emit('succes', 'You have succesfully joined this room');
    } else {
      return socket.emit('err', 'ERROR, No Room named ' + room);
    }
  });

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    console.log('message: ', msg);

    io.to(user.room).emit('chatMessage', { user: user.username, message: msg });
  });

  // Ingredient id handler
  // socket.on('query', (queryInfo) => {
  //   io.emit('query', queryInfo);
  //   getQueryData(queryInfo.query);
  // });

  // // Chosen recipe handler
  // socket.on('chosenRecipe', (recipeID) => {
  //   io.emit('chosenRecipe', recipeID);
  //   getDataOfRecipe(recipeID);
  // });

  // // Message handler
  // socket.on('message', (messageInfo) => {
  //   chatMessages.push('message');
  //   console.log(chatMessages);
  //   io.emit('message', messageInfo);
  // });

  // Detects when user has disconnected
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      // message that user left
      // io.to(user.room).emit(
      //   'message',
      //   formatMessage(botName, `${user.username} has left the chat`)
      // );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });

  // async function getQueryData(query) {
  //   // Get data by query
  //   let dataQuery = await getData(query);

  //   // return emitted data for clientside handling
  //   return io.emit('data', dataQuery);
  // }

  // async function getDataOfRecipe(id) {
  //   // Get data by id
  //   let dataRecipe = await getRecipeData(id);

  //   // return emitted data for clientside handling for the other client
  //   // return socket.broadcast.emit('dataRecipe', dataRecipe);
  //   return io.emit('dataRecipe', dataRecipe);
  // }
});

http.listen(port, () => {
  console.log(`listening on port ${port}`);
});
