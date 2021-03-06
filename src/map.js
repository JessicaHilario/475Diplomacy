const fs = require("fs")
//const db = require("./db_interactions/db_test.js")
const http = require("http")
const events = require('events')
const electron = require('electron');
const {ipcRenderer} = electron;

var hostIp = "";


index = 0;           // keep the count of the number of instuctiosn
current_instruction = [];
instruction_position = 0;     // keep the count of the position of the instruction (A-Moscow-Russia/move)
var originalColor;
country = ""
let intervalObj;
total_instructions = "";     // String to display current orders in map.html

var em = new events.EventEmitter();



function peruse(id){
  D=document.getElementById("E")
  SVGDoc=D.getSVGDocument()
  who=SVGDoc.getElementById(id)
  who.style.fill = "#3399ff"
  whoName=who.id
  current_instruction.push(String(who.id));
  alert(whoName)
}

// push the move command after the unit has been selected
function move(){
  if(instruction_position == 1){
    current_instruction[index] += "/move"
    instruction_position++

    //show instruction on the screen
    total_instructions += "/move"
    document.getElementById("currentInstructions").innerHTML = total_instructions;
  }
}

function moveunit(id, dest){
    D = document.getElementById("E")
    doc = D.getSVGDocument()
    troop = doc.getElementById(id)

    alert(troop.getAttribute("cx"))


    target = doc.getElementById(dest)
    alert(target)

    targetX = target.getAttribute("cx")
    troop.setAttribute("cx", targetX)
    // moving
}

function support() {
  if(instruction_position == 1){
    current_instruction[index] += "/support"
    instruction_position++

    //show instruction on the screen
    total_instructions += "/support"
    document.getElementById("currentInstructions").innerHTML = total_instructions;
  }
}

function convoy() {
    alert(current_instruction)

    // try to create a unit
    D=document.getElementById("E")
    SVGDoc=D.getSVGDocument()
    //who=SVGDoc.getElementById(id)

    // var ellipse = SVGDoc.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    // ellipse.setAttribute("cx", "164.08784");
    // ellipse.setAttribute("cy", "10.62364");
    // ellipse.setAttribute("rx", "0.421305");
    // ellipse.setAttribute("ry", "0.421305");
    // ellipse.setAttribute("fill", "#ff00e9");
    // ellipse.setAttribute("id", "A-Sweden-England")



    // SVGDoc.getElementById("layer2").appendChild(ellipse);



    // how to delete
    // delUnit = SVGDoc.getElementById("F-Edinburgh-England")
    // SVGDoc.getElementById("layer2").removeChild(delUnit)
}


function hold() {
  if(instruction_position == 1){
    current_instruction[index] += "/hold"
    instruction_position = 0;

    index++;

    //show instruction on the screen
    total_instructions += "/hold" + "<br/>";
    document.getElementById("currentInstructions").innerHTML = total_instructions;
  }
}

function endTurn() {
  alert("submitted: " + current_instruction)
  total_instructions="";
  document.getElementById("currentInstructions").innerHTML = total_instructions;

  // send information to host
  hostIp = fs.readFileSync('hostIp.txt', "utf8");

  clientCountry = fs.readFileSync('country.txt', "utf8");

  // send the current instruction to host
  var post = http.request({
      hostname: hostIp,
      port: 3001,
      path: '/instructionPost',
      method: 'POST',
      'content-type': 'text/plain'
    }, (res) => {
      console.log("got a response");
    })

  post.on("Error", (err) =>{
    console.log(err);
  })

  jsonObj = {country: clientCountry,
             instructions: current_instruction.toString()}

  post.write(JSON.stringify(jsonObj));

  // pollResolve();
  intervalObj = setInterval(pollResolve, 2000);
  // reset instructions after posting
  current_instruction = []
  instruction_position = 0
  index = 0;

  post.end();
  // begin polling for resolve orders
}


function pollResolve(){
  // ready the host server
  console.log("polling for resolve");
  var get = http.get({
  hostname: hostIp,
  port: 3001,
  path: '/resolveOrders',
  'content-type': 'text/plain'
  }, (res) => {
    body = []
    res.on("data", (chunk) => {
      body.push(chunk);
    }).on("end", ()=>{

      if(body[0] == "not ready"){
        console.log("resolve not ready");
        get.end();
        return;
      }
      else{
        // Begin executing orders that have been resolved

        // update the year and season
        date = JSON.parse(body).date
        document.getElementById("yearSeason").innerHTML = date

        body = JSON.parse(body).instruct

        addedString = ""    // string to show user the executed instructions
        for(i in body){
          // execute all orders sent from host
          // alert("the instructs are " + body[i])
          execute(body[i])
          addedString += body[i] + "<br/>"
        }


        stringHtml =`<!DOCTYPE html>
        <html lang="en" dir="ltr">
          <head>
            <meta charset="utf-8">
            <title>Executed Instructions</title>
          </head>
          <body>` +
           addedString +
            `</body>
            </html>`


        // write issued commands to file to show user
        fs.writeFile('executedInstr.html', stringHtml, (err) => {
          if(err) throw wrr;
        });

        // emit event to open window of executed instructions
        // var instruct = window.open("executedInstr.html", "Instruction", "toolbar=no,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400");
        // instruct.document.write('<h1>Hello</h1>')
        ipcRenderer.send("showExecuted");
      }
    })
  })

  get.end();

}

function execute(instruction){
  D = document.getElementById("E")
  doc = D.getSVGDocument()

  order = instruction.split("/")

  if(order[1] == "move"){
    troop = doc.getElementById(order[0].toString())

    dest = "C " + order[2]
    target = doc.getElementById(dest)

    targetX = target.getAttribute("cx")
    targetY = target.getAttribute("cy")


    // test if troop is an army or fleet
    if(troop.getAttribute("cx") == null){
      troop.setAttribute("x", targetX)
      troop.setAttribute("y", targetY)
    }
    else{
      troop.setAttribute("cx", targetX)
      troop.setAttribute("cy", targetY)
    }

    // changing id of unit
    troopid = troop.id.toString().split("-")
    newTroopid = troopid[0] + "-" + order[2] + "-" + troopid[2]

    troop.setAttribute("id", newTroopid)
  }
  else if(order[1] == "hold"){

  }
}


/* for chat display */
function openForm() {
    document.getElementById("myForm").style.display = "block";
}

function closeForm() {
    document.getElementById("myForm").style.display = "none";
}

/**
 * Grabs a province or unit to be push on the instructions array
 */
function Here(id){
    // grab the province that was clicked
    D=document.getElementById("E")
    SVGDoc=D.getSVGDocument()

    // grab the unit if this is the first click
    if(instruction_position == 0){
      // we need to grab the owner of the country

      country = fs.readFileSync('country.txt', "utf8");

      // then append it at the end of unitStr
      // grab the Army unit
      unitStr = "A-" + String(id) + "-" + country
      unit = SVGDoc.getElementById(unitStr);
      // if Army unit does not exist grab the fleet
      if(unit == null){
        unitStr = "F-" + String(id) + "-" + country
        unit = SVGDoc.getElementById(unitStr);
      }
      // if the unit is still null there is no troop in the province
      if(unit == null){
        alert("no unit selected")
        return;
      }

      current_instruction.push(unitStr);
      // if the unit is still null there is no unit on that province //
      unitId = unit.id

      instruction_position++


      //show instruction on the screen
      total_instructions +=  current_instruction[index];
      document.getElementById("currentInstructions").innerHTML = total_instructions;

    }
    else if(instruction_position == 2){
      // selecting the province to move the unit to
      current_instruction[index] += "/"+id
      instruction_position = 0

      //show instruction on the screen
      total_instructions +=  "/" +id + "<br/>";
      document.getElementById("currentInstructions").innerHTML = total_instructions;

      index++;
    }


    // change color of province
    if(prv.style.fill === "rgb(234, 11, 140)"){
    prv.style.fill = "#3399ff"
    }
    else{
    prv.style.fill = "#ea0b8c"
    }
}

function hoverIn(id){
    prv=document.getElementById(id)
    originalColor = document.getElementById(id).style.fill
    prv.style.fill="#000000"
}

function hoverOut(id) {
    prv=document.getElementById(id)
    if (prv.style.fill !=  "#ea0b8c") {
        prv.style.fill = originalColor
    }
}

module.exports.mapEvent = em;
