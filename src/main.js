const {app, ipcMain, BrowserWindow, ipcRenderer} = require('electron')
const client = require("./client.js");
const server = require("./server.js");
const http = require("http");
const fs = require("fs");
const mapjs = require("./map.js")
const electron = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let startWin
let chatWin
let instrWin
let mapSwitch = false;    // flag to represent when the game screen is open

let screen_width;         // full size screen width

let screen_height;        //full screen size height



function createWindow () {
  //get the screen's width and height
  //have to call electron.screen here
  screen_width = electron.screen.getPrimaryDisplay().workAreaSize.width;
  screen_height = electron.screen.getPrimaryDisplay().workAreaSize.height

  // Create the browser window.
  win = new BrowserWindow({ width: screen_width, height: screen_height })

  // and load the index.html of the app.
  win.loadFile('index.html')

  win.setMenuBarVisibility(false)
  // Open the DevTools.
 // win.webContents.openDevTools()


  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })


}

/**
 * This function creates a new window and loads startScreen.html
 * this function should be called when the user presses the play button from index.html
 */
function createStart () {
  // Create the browser window.
  startWin = new BrowserWindow({ width: screen_width, height: screen_height })

  // and load the index.html of the app.
  startWin.loadFile('startScreen.html')
  // Open the DevTools.
 win.webContents.openDevTools()

  // Emitted when the window is closed.
  startWin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    startWin = null
  })
}

/**
 * This function creates a new window and loads lobby.html
 * this function should be called after the user succesfully joins a host's game
 */
function lobby () {
  // Create the browser window.
  startWin = new BrowserWindow({ width: screen_width, height: screen_height })

  // and load the index.html of the app.
  startWin.loadFile('clientLobby.html')
  // Open the DevTools.

  // Emitted when the window is closed.
  startWin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    startWin = null
  })
}

/**
 * This function creates a new window and loads map.html
 * this function should be after host has started the game
 */
function map () {
  // Create the browser window.
  startWin = new BrowserWindow({ width: screen_width, height: screen_height })
  // and load the index.html of the app.
  startWin.loadFile('map.html')
  // Open the DevTools.

  // Emitted when the window is closed.
  startWin.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    startWin = null
  })
}

/**
 * creates a new window and loads executedInstr.html
 * executes after users moves instruction
 */
function showExecuted () {
  instrWin = new BrowserWindow({ width: 400, height: 600 })

  instrWin.loadFile("executedInstr.html")

  instrWin.on('closed', () =>{
    instrWin = null
  })
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
})

/**
 * Event listenter that opens startScreen.html from index.html
 * @listens Played
 */
ipcMain.on("Played", (event, arg) => {
  console.log(arg)  // prints arg
  createStart();    // Open a new Window for start menu
  win.close();      // close the previous window
})

/**
 * Event listener that switches to lobby html after a client has succesfully sent
 * the userName and ip to the host
 */
client.clientEvent.on("SwitchToLobby", () => {
  console.log("Switching to lobby");
  lobby();      // open lobby.html when succesfully joining host
  win.close();
});

ipcMain.on("openMap", ()=> {
  // change game status inside server
  gs = server.changeGameStatus();
  map();
  win.close();
})

/**
 * This event is triggered after a game host creates a game from
 * host.html
 */
ipcMain.on("StartChecking", (event, arg) => {
  console.log("we started checking in the lobby");

  names = server.startClientPolling();
  console.log(names);
  event.sender.send("ping", names);
})

/**
 * This event is triggered after a client has sent username to host
 * The list of current users is updated in client.js
 */
 ipcMain.on("updateClientLobby", (event, arg) =>{
   console.log("starting to check client's lobby");
   names = client.requestUsers(); // send http get request to host and return userNames

   event.sender.send("clientPing", names.join(" - "));

   // poll for game status
   // if its true open up game screen
   stat = client.pollGameStatus(); // returns array of json
   jsonObj = JSON.parse(stat)      // parse it to json
   gameflag = ""

   if(stat != undefined && mapSwitch == false){
     try{
        // look at countries
       console.log("client's country is " + client.getCountry());
       name = client.getName();         // grab the client name
       for(i in jsonObj.status[1]){
         // get the country for the user
         if( name == jsonObj.status[1][i].username){
           client.setCountry(jsonObj.status[1][i].Country);
           console.log("country is now set to " + jsonObj.status[1][i].Country);

           fs.writeFile('country.txt', jsonObj.status[1][i].Country, (err) => {
               // throws an error, you could also catch it here
               if (err) throw err;
               // success case, the file was saved
               console.log('country saved!');
           });
         }
       }

       gameflag = jsonObj.status[0];
    }
    catch(err){
      console.log("error" + err);
    }
   }

   if (gameflag == "True" && mapSwitch == false){
     console.log("TRYING TO OPEN MAP");
     mapSwitch = true;
     // udpate client country

     map();   // change to ingame screen
     // win.close();
   }
 })

ipcMain.on("Host", (event, arg) => {
  console.log(arg); // prints arg
})

ipcMain.on("Join", (event, arg) => {
  console.log(arg); // prints arg
})

ipcMain.on("Options", (event, arg) => {
  console.log(arg); // prints arg
})

/**
 * Event listener that triggers the sendUser function which sends the userName
 * to the host.
 * @listens SendUser
 */
ipcMain.on("SendUser", (event, arg) => {
  client.sendUser(arg.ip, arg.userName, arg.clientIP, arg);    // send username to server
                                            // determined by ip
                                            // write hostip to file
  fs.writeFile('hostIp.txt', arg.ip, (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;
      // success case, the file was saved
      console.log("saved hostIp");
  });
});

ipcMain.on("SendSetting", (event, arg) => {
  console.log("IN MAIN game name =" + arg.gameName);

  var post = http.request({
    hostname: arg.ip,
    port: 3001,
    path: '/sendSetting',
    method: 'POST',
    'content-type': 'text/plain'
  }, (res) => {
    console.log("Setting captured")
    console.log(res.statusCode);
  })


  post.write(JSON.stringify(arg));
  post.on("Error", (err) => {
    console.log(err);
  });
  post.end();

  // write hostip to file
  fs.writeFile('hostIp.txt', arg.ip, (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;
      // success case, the file was saved
      console.log("saved hostIp");
  });
});

/**
 *  open window displaying executed orders after every turn
 */
ipcMain.on("showExecuted", (event, arg) =>{
  showExecuted();
})



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
