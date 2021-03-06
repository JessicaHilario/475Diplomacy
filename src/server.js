const express = require('express')
const app = express();
const http = require('http');
const os = require('os');
const ip = require('ip');
const events = require('events');
const electron = require('electron');
const {ipcRenderer} = electron;
const fs = require("fs")


var em = new events.EventEmitter();
gameStatus = false;

const port = 3001;
const hostIP = ip.address();
pollFlag = false;
serverFlag = false;

country = ""                // what country the player is in charge of
let countries = ["France", "Germany", "Italy", "Austria", "Turkey", "England", "Russia"]
let users = [];             // array to hold userNames of clients
let intervalObj;            // Timeout object that polls for user information
let serverObj;              // used to close http server
let setting;
let adjucation;

let instruction = [];
let userSubmissions = 0;
let resolveReady = false;
let usersThatRead = 0;
let gameSize = 1;

let year = 1901;          // variable used ingame to hold year
let season = "fall";      // initalize the starting season

let neighbor = {
    Moscow:["Ukraine", "Stevastopol", "Warsaw", "Livonia", "Saint Petersburg"],
    "Saint Petersburg":["Finland", "Norway", "Livonia","Moscow"],
    Finland:["Sweden","Norway","Saint Petersburg"],
    Sweden:["Norway","Finland"],
    Norway:["Sweden","Finland","Saint Petersburg"],
    Livonia:["Saint Petersburg","Moscow","Warsaw","Prussia"],
    Ukraine:["Moscow","Warsaw","Galicia","Stevastopol","Rumania"],
    Stevastopol:["Moscow","Ukraine","Rumania","Armenia"],
    Armenia:["Stevastopol","Ankara","Smyrna","Syria"],
    Syria:["Armenia","Smyrna"],
    Smyrna:["Syria","Armenia","Ankara","Constantinople"],
    Ankara:["Constantinople","Armenia","Smyrna"],
    Constaninople:["Ankara","Smyrna","Bulgaria"],
    Greece:["Albania","Serbia","Bulgaria"],
    Albania:["Trieste","Serbia","Greece"],
    Serbia:["Trieste","Budapest","Rumania","Bulgaria"],
    Bulgaria:["Constantinople","Greece","Serbia","Rumania"],
    Rumania:["Stevastopol","Ukraine","Galicia","Budapest","Bulgaria","Serbia"]

}


/**
 * handle post request from clients trying to Join
 * This stores the username and ip of clients trying to join a game
 */
app.post("/", (req, res) => {
  let body = []
  console.log("you posted something");
  req.on("data", (chunk) =>{ // process the username and ip
    body.push(chunk);

  }).on("end", () => {
    let jsonObj = JSON.parse(Buffer.concat(body).toString());  // push it to the array

    let jsonClient = {"username": jsonObj.userName,
                      "IP": jsonObj.clientIP,
                      "Country": countries.pop()};


    users.push(jsonClient);     // add the username to the list of usernames
    console.log("the users so far are ");
    console.log(users);
    gameSize += 1;                 // increase gameSize for resolve calculations
    console.log("the size is " + gameSize);
    res.end();
  });
  req.on("error", (err)=>{
    console.log("got an error");
  });
});


app.post("/sendSetting", (req, res) => {
  console.log("ENTERING SEND SETTING");
  let body = []

  req.on("data", (chunk) =>{
    body.push(chunk);

  }).on("end", () => {
    let jsonObj = JSON.parse(Buffer.concat(body).toString());

    setting = {
      "gameName": jsonObj.gameName,
      "description": jsonObj.description,
      "playerType": jsonObj.playerType,
      "adjucation": jsonObj.adjucation
    };

    let host = {
      "username": jsonObj.username,
      "IP": hostIP,
      "Country": countries.pop()
    };
    // setting the country
    country = host.Country;
    fs.writeFile('country.txt', country, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;
        // success case, the file was saved
        console.log('country saved!');
    });



    // setAdjucation(jsonObj.adjucation)

    users.push(host);     // add host username to the list of usernames
    console.log(setting);
    res.end();
  });
  req.on("error", (err)=>{
    console.log("got an error");
  });
});


function setAdjucation(adj){
  switch(adj){
    case "15 minutes": adjucation = 15;
      break;
    case "30 minutes": adjucation = 30;
      break;
    case "60 minutes": adjucation = 60;
      break;
    case "120 minutes": adjucation = 120;
      break;
    case "Daily": adjucation = 1440;
      break;
    default: console.log("Adjucation period not valid");
      break;
  }
}




/**
 * Respond to get user request for lobby.html
 */
app.get('/lobby', function(req, res){
  // get username of current users
  var names = []
  for (var item in users){

    names.push(users[item].username)
  }
  res.send(names);
});

/**
 * Create html to show the game start status
 */
app.get('/gameStart', function(req, res){
  // get username of current users
  jsonObj = users
  if (gameStatus == false){
    status = {"status":["False", jsonObj]}
    res.send(status);
  }
  else{
    status = {"status":["True", jsonObj]}

    res.send(status);
  }
});

app.post("/instructionPost", (req, res) => {
  let body = []
  req.on("data", (chunk) =>{
    body.push(chunk);
  }).on("end", () =>{
    let jsonObj = JSON.parse(Buffer.concat(body))

    insertJson = {country:jsonObj.country,
                  clientInstruction:jsonObj.instructions
                  }

    instruction.push(insertJson);
    console.log("the insertJson is " + insertJson);
    console.log("the instruction is " + insertJson.clientInstruction);

    userSubmissions++;

    // if everyone submitted begin the next round
    if(userSubmissions == gameSize){
      // begin resolve flag that resolve order is ready
      console.log("setting resolve ready");
      resolveReady = true;
      userSubmissions = 0;

    }
  })

  req.on("error", (err)=>{
    console.log("got an error");
  });
  res.end();
});


/*
 * start server prompts user when to resolve orders and
 * inform users what orders to execute
 */
app.get('/resolveOrders', function(req, res){
  // get username of current users
  if(resolveReady == false){
    // the order isn't ready yet
    res.send("not ready")
    res.end();
  }
  else{
    // alogrithm to determine which order executes
    // then send them to all clients
    usersThatRead++;
    if(usersThatRead == gameSize){
      console.log("closing resolve");
      resolveReady = false;
    }

    console.log("RESOLVE IS READY");
    moves = []
    // grab all instructions
    for(i in instruction){
      tempInstruct = instruction[i].clientInstruction.split(",");
      for(x in tempInstruct){
        moves.push(tempInstruct[x])   // add instruct for current country
      }
    }
    console.log("all instruction in resolve is " + moves);

    // now grab all the moves and holds
    atk = []
    power_atk = []
    holds = []
    power_holds = []

    index = -1;
    for(l in moves){
      index = moves[l].indexOf("move")
      if(index != -1){
        atk.push(moves[l])    // add move to proper array
        power_atk.push(0)     // add equivalent power level
      }
      index = -1
    }

    //////////////////// neighbor resolve ///////////////////////
    // // remove the move if it's not going to a neighbor
    // for(i in atk){
    //   source = atk[i].split("/")[0].split("-")[1]
    //   dest = atk[i].split("/")[2]
    //
    //   // remove the instruction if it's not going to a neighbor
    //   if(!neighbor[source].includes(dest)){
    //     console.log("REMOVING: " + atk[i]);
    //     atk.splice(i, 1)
    //     power_atk.splice(i, 1)
    //   }
    // }



    // grabbing all holds
    for(l in moves){
      index = moves[l].indexOf("hold")
      if(index != -1){
        holds.push(moves[l])    // add move to proper array
        power_holds.push(0)     // add equivalent power level
      }
      index = -1
    }

    // grab all supports
    support = []
    index = -1
    for(l in moves){
      index = moves[l].indexOf("support")
      if(index != -1){
        support.push(moves[l]);
      }
      index = -1;
    }

    // increase power of moves
    for(l in support){
      supportInstruct = support[l].split("/")
      // get the supported province
      supported_province = supportInstruct[2]

      // scan the move arrays
      for(i in atk){
        atk_instruct = atk[i].split("/")
        atk_province = atk_instruct[0].split("-")[1]  // grab sitting province

        // increase power level is province is being supported
        if(supported_province == atk_province){
          power_atk[i] = power_atk[i] + 1;
        }
      }
    }
    // so now we have array of moves and there power level.
    // scan every atk instruct with itself. if there is conflicting moves
    // compare power levels. if they are equal non execute

    // if you are moving where someone is moving
    for(i in atk){
      firstAtkDest = atk[i].split("/")[2]     // grab first dest

      for(l in atk){
        if(i == l){   // skip same moves
          continue;
        }
        secondAtkDest = atk[l].split("/")[2]  // grab second dest

        if(firstAtkDest == secondAtkDest){  // resolve conflicting moves
          console.log("There is a conflict two moves to resolve");
          firstPower = power_atk[i]
          secondPower = power_atk[l]

          if(firstPower > secondPower){
            atk.splice(l, 1)
          } else if(firstPower < secondPower){
            atk.splice(i, 1)
          }else{  // if they have equal power pop both out
            if(i > l){
              atk.splice(i, 1)
              atk.splice(l, 1)
            }
            else if(i < l){
              atk.splice(l, 1)
              atk.splice(i, 1)
            }

          }
        }
      }
    }

    // resolve holds power
    for(i in atk){
      firstAtkDest = atk[i].split("/")[2]     // grab first dest

      for(l in holds){
        holdDest = holds[l].split("/")[0].split("-")[1]  // grab second dest

        if(firstAtkDest == holdDest){  // resolve conflicting moves
          console.log("There is a conflict of hold resolve");
          firstPower = power_atk[i]
          defPower = power_holds[l]

          if(firstPower > defPower){
            // atk.splice(l, 1)
            // prompt defender to resolve

          } else if(firstPower < secondPower){
            atk.splice(i, 1)      // if hold wins push out atk

          }else{
            atk.splice(i, 1)      // else if both have equal power push out atk
          }
        }
      }
    }



    // resolve move onto a hold



    console.log("the attack moves are " + atk);
    console.log("the equivalent power " + power_atk);

    // increase power level


    // grab the units trying to move and support from all the instructiosn

    // reset instruction after all clients reads them
    if(usersThatRead == gameSize){
      instruction = []
      usersThatRead = 0;
    }

    atk = atk.concat(holds)


    if(season == "fall"){
      season = "spring"
    }
    else if(season == "spring"){
      season = "winter"
    }
    else if(season == "winter"){
      season = "fall"
      year++;
    }

    jsonObj = {
              date: year + " " + season,
              instruct: atk
              }

    res.send(jsonObj);

    res.end();
  }
});




/**
 * This function begins the server that listens to post request
 * from clients sending their usernames and ip addresses
 */
function startServer () {
  serverObj = app.listen(port, hostIP, () =>{
    console.log("connected----------------------------");
  });
}


/**
 * Function that regularly checks and updates the current list of players
 *
 */
function updateUsers () {
  if(serverFlag == false){
    serverFlag = true;
    intervalObj = setInterval(updateUsers, 1000);

  }
  ipcRenderer.send("StartChecking");
}

/**
 * Function that starts client polling in an interval every 10 seconds
 * and returns the list as a string
 */
function startClientPolling () {

  if(pollFlag == false){
    //intervalObj = setInterval(startClientPolling, 1500);      // poll every 10 seconds
    console.log("server flag is false");
    startServer();        // start server to handle client's post ///<<<<<<<<<<<<<<<<<

    pollFlag = true;
  }
  else{
    var names = [];

    console.log("*************")
    for (var item in users){
      names.push(users[item].username)
    }
    console.log("the names is " + names)
    return names.join(" - ");
    // mains will update lobby.html

  //  em.emit("PollUsers", names.join(" - "));     // notify main to update lobby.html
  }

}

/**
 * Function that cancels the client poll
 * called when the host cancels the game or starts the game
 * open the game map in from main.js
 * and change the contents of /getlobby
 */
function stopClientPolling () {
  gameStatus = true;    // change gamestatus to tell clients to switch to map.html
  clearInterval(intervalObj);     // close the repeated queue for clients
  //serverObj.close(); closes the http server
}


/*
 * Return the local ip as a string
 * Used in host.html to display ip to join
 */
function display_ip(){
  document.getElementById("ip").write("hello world")
  alert("hello world")
}

/*
 * tell clients that game started ,so they can switch to
 * the game screen
 *
 */
function changeGameStatus(){
  gameStatus = true;
  return gameStatus;
}


/**
 * Function that returns the localip
 * called in host.html and lobby.html to display ip  that
 * clients should join
 */
function getHostIp(){
  return String(hostIP);
}

/*
 * returns the clients country
 */
function getCountry(){
  return country;
}


/**
 * return the country assigned to the player
 */
function grabCountry(){
  let c = fs.readFileSync('country.txt');
  return c;
}

// startServer();
module.exports.stopClientPolling = stopClientPolling;
module.exports.startServer = startServer;
module.exports.getHostIp = getHostIp;
module.exports.serverEvent = em;
module.exports.startClientPolling = startClientPolling;
module.exports.updateUsers = updateUsers;
module.exports.changeGameStatus = changeGameStatus;
module.exports.getCountry = getCountry;
module.exports.grabCountry = grabCountry;
