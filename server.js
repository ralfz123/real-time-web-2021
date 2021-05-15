const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;

const { getData, getRecipeData } = require('./modules/data/fetch.js');
const {
  userJoin,
  getRoom,
  addChatMsg,
  addLikedRecipe,
  getCurrentUser,
  getCurrentUserrr,
} = require('./modules/utils/stateFunctions.js');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render('index.ejs');
});

const rooms = [
  'room1',
  'room2',
  'room3',
  'room4',
  'room5',
  'room6',
  'room7',
  'room8',
  'room9',
  'room10',
];

io.on('connection', (socket) => {
  console.log('user connected');
  // socket.emit('welcome', 'Hello welcome to Cooking on Remote!');

  socket.on('joinRoom', ({ room, user }) => {
    const newUser = userJoin(room, user, socket.id);
    // console.log(getRoom(room));
    const roomData = getRoom(room);

    socket.join(room);

    if (rooms.includes(room)) {
      socket.join(room);

      socket.in(room).emit('roomData', {
        room: roomData.id,
        users: roomData.users,
        chat: roomData.chat,
        likedRecipes: roomData.likedRecipes,
      });

      io.in(room).emit('roomData', {
        room: roomData.id,
        users: roomData.users,
        chat: roomData.chat,
        likedRecipes: roomData.likedRecipes,
      });

      return (
        socket.emit(
          'joinSucces',
          `${user}, You have succesfully joined ${room}`
        ) && socket.to(room).emit('userJoined', `${user} joined this room`)
      );
    } else {
      return socket.emit('joinError', 'ERROR, No Room named ' + room);
    }
  });

  // Listen for chatMessage
  socket.on('chatMessage', ({ msg, room }) => {
    // 1. Which user
    const currentUser = getCurrentUser(socket.id, room);
    const currentUserName = currentUser.username;

    // 2. Send msg to clients
    io.to(room).emit('chatMessage', { user: currentUserName, message: msg });

    // 3. Add msg to chat global state for later users
    addChatMsg(msg, room, currentUser);
  });

  // Ingredient id handler
  socket.on('query', ({ query }) => {
    getQueryData(query);
  });

  // Liked recipe handler
  socket.on('likedRecipe', async ({ recipeID, room }) => {
    // 1. Which user
    const currentUser = getCurrentUser(socket.id, room);
    // const currentUserName = currentUser.username;

    // 2. Fetch data
    let recipeData = await getRecipeData(recipeID);

    // 4. Add recipe to server global state
    const recipesCount = addLikedRecipe(recipeData[0], room, currentUser);

    // 1b. which room
    const roomData = getRoom(room);
    const recipesState = roomData.likedRecipes;

    if (recipesCount == true) {
      // 3. Add recipe to all clients
      io.to(room).emit('likedRecipesList', {
        // user: currentUserName,
        recipes: recipesState,
      });
    } else {
      console.log('The limit (5) is reached!');

      const roomData = getRoom(room);
      const firstJoinedUser = roomData.users[0];

      // push to global state so when new user joins, he gets alert that the limit is reached

      io.to(room).emit(
        'alertMessageRecipe',
        `There are already 5 recipes chosen. ${firstJoinedUser.username} has to choose one recipe you all are going to make!`
      );

      // Say to first joined user that he has to choose and give him a choice menu
      socket.emit('menu', `user id = ${firstJoinedUser.id}`); //succeeded
    }
  });

  // // Won recipe (chosen) roomdata[roomID].likedRecipes = array with liked recipes, there is one chosen
  // socket.on('likedRecipe', async ({ recipeID, room }) => {
  //   // 1. Which user
  //   const currentUser = getCurrentUser(socket.id, room);
  //   const currentUserName = currentUser.username;

  //   // 2. fetch data by recipe id
  //   let wonRecipeData = await getRecipeData(recipeID);

  //   // 3.   add recipe to Clients -- add msg to clients that one recipe is chosen
  //   io.to(room).emit('likedRecipesList', {
  //     user: currentUserName,
  //     recipe: recipeData[0].id,
  //   });

  //   // 4. Add recipe to server global state
  //   addLikedRecipe(recipeData, room, currentUser);
  // });

  // Detects when user has disconnected
  socket.on('disconnect', () => {
    // 1. Which user
    // const currentUser =
    getCurrentUserrr(socket.id, rooms);
    // currentUser;
    // const currentUserName = currentUser.username;

    // 2. Which room
    // Roomstate[room].users.username.id[socketid] // --> returns room
    // console.log(getRoom(room).keys());
    // const roomData = getRoom(room);
    // console.log(roomData);

    // 2. Delete user from array
    // const deleteUser = userJoin(room, user, socket.id);
    // const user = userLeave(room, user, socket.id);

    // 3. Render clientside the room userslist

    // if (user) {
    //   // message that user left
    //   // io.to(user.room).emit(
    //   //   'message',
    //   //   formatMessage(botName, `${user.username} has left the chat`)
    //   // );

    //   // Send users and room info
    //   io.to(user.room).emit('roomUsers', {
    //     room: user.room,
    //     users: getRoomUsers(user.room),
    //   });

    //   socket.to(newUser.room).emit('userJoined', `${user} joined this room`);
    // }
  });

  async function getQueryData(query) {
    // Get data by query
    let dataQuery = await getData(query);

    // return emitted data for clientside handling
    return socket.emit('queryData', dataQuery);
  }

  async function getDataOfRecipe(id) {
    // Get data by id
    let dataRecipe = await getRecipeData(id);

    // return emitted data for clientside handling for the other client
    return socket.broadcast.emit('dataRecipe', dataRecipe);
  }
});

// app.get('/match/:id', async function (req, res) {
//   let data = await getRecipeData(req.params.id);
//   console.log(data);
//   res.render('pages/match.ejs', { data: data[0] });
// });

http.listen(port, () => {
  console.log(`listening on port ${port}`);
});
