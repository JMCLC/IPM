// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER   = "36-AL";      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY   = false;  // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let lastX = 0;
let lastY = 0;
let current_distance = 0;
let inputArea        = {x: 0, y: 0, h: 0, w: 0}    // Position and size of the user input area

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (54 trials)
let hits 			 = 0;      // number of successful selections
let misses 			 = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets     = false;  // used to control what to show in draw()
let trials 			 = [];     // contains the order of targets that activate in the test
let current_trial    = 0;      // the current trial number (indexes into trials array above)
let attempt          = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs        = [];     // add the Fitts ID for each selection here (-1 when there is a miss)


// Target class (position and width)
class Target
{
  
  constructor(x, y, w)
  {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

// Runs once at the start
function setup()
{
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)
  
  randomizeTrials();         // randomize the trial order at the start of execution
  
  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user start-up screen (student ID and display size)
}

// Runs every frame and redraws the screen
function draw()
{
  if (draw_targets)
  {     
    // The user is interacting with the 6x3 target grid
    background(color(0,0,0));        // sets background to black
    
    // Print trial count at the top left-corner of the canvas
    fill(color(255,255,255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);
    
    // Draw all 18 targets
	for (var i = 0; i < 18; i++) drawTarget(i);
    
    // Draw the user input area
    drawInputArea()

    fill(color(0,255,0));
    stroke(color(255,0,0));
    strokeWeight(2);
    circle(inputArea.x + TARGET_SIZE/2, inputArea.y - PPCM - ((5 * TARGET_SIZE)/4) * 2, TARGET_SIZE);
    noStroke()
    fill(color(0,120,0));
    circle(inputArea.x + TARGET_SIZE/2, inputArea.y - PPCM - (5 * TARGET_SIZE)/4 , TARGET_SIZE);
    
    fill(color(0,255,0));
    stroke(color(255,0,0));
    strokeWeight(2);
    circle(inputArea.x + TARGET_SIZE/2, inputArea.y - PPCM, TARGET_SIZE);
    fill(color(0,120,0));
    circle(inputArea.x + TARGET_SIZE/2, inputArea.y - PPCM, TARGET_SIZE/2);
    noStroke()
    
    
    fill(color(255,255,255))
    text("Alvo atual", inputArea.x + TARGET_SIZE + PPCM/5, inputArea.y - PPCM - ((5 * TARGET_SIZE)/4) * 2)
    text("Próximo Alvo", inputArea.x + TARGET_SIZE + PPCM/5, inputArea.y - PPCM - (5 * TARGET_SIZE)/4)
    text("Atual e Próximo Alvo", inputArea.x + TARGET_SIZE + PPCM/5, inputArea.y - PPCM)
    text("TIP: Utilize o retângulo.", inputArea.x, inputArea.y + inputArea.h + PPCM/2)

    // Draw the virtual cursor
    let coords = getSquare();
    let x = coords[0];
    let y = coords[1];
    fill(color(255,255,255));
    circle(x,y, 0.4 * PPCM);

  }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance()
{
  // DO NOT CHANGE THESE! 
  let accuracy			= parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time         = (testEndTime - testStartTime) / 1000;
  let time_per_target   = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty           = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty	= nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp         = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
  
  background(color(0,0,0));   // clears screen
  fill(color(255,255,255));   // set text fill color to white
  text(timestamp, 10, 20);    // display time on screen (top-left corner)
  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width/2, 60); 
  text("Hits: " + hits, width/2, 100);
  text("Misses: " + misses, width/2, 120);
  text("Accuracy: " + accuracy + "%", width/2, 140);
  text("Total time taken: " + test_time + "s", width/2, 160);
  text("Average time per target: " + time_per_target + "s", width/2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width/2, 220);
  
  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  // 
    text("Target " + 1 + ": ---", width/5, 75);
  for (var i = 1; i < trials.length/2; i++) {
    if (fitts_IDs[i] === -1)
      text("Target " + (i+1) + ": MISSED", width/5, 75 + 22*i);
    else
      text("Target " + (i+1) + ": " + fitts_IDs[i], width/5, 75 + 22*i);
  }
  i = 0;
  for (var j = trials.length/2; j < trials.length; j++) {
    if (fitts_IDs[j] === -1)
      text("Target " + (j+1) + ": MISSED", (4*width)/5, 75 + 22*i);
    else
      text("Target " + (j+1) + ": " + fitts_IDs[j], (4*width)/5, 75 + 22*i);
    i++;
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = 
  {
        project_from:       GROUP_NUMBER,
        assessed_by:        student_ID,
        test_completed_by:  timestamp,
        attempt:            attempt,
        hits:               hits,
        misses:             misses,
        accuracy:           accuracy,
        attempt_duration:   test_time,
        time_per_target:    time_per_target,
        target_w_penalty:   target_w_penalty,
        fitts_IDs:          fitts_IDs
  }
  
  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY)
  {
    // Access the Firebase DB
    if (attempt === 0)
    {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }
    
    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    append(db_ref,attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() 
{
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets)
  {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);
    if(current_trial !== 0){
      current_distance = dist(target.x,target.y,lastX,lastY);
    }
    else{
      current_distance = -1;
    }
    
    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
        
    if (insideInputArea(mouseX, mouseY))
    {
      let coords = getSquare();
      let virtual_x = coords[0];
      let virtual_y = coords[1];
      
      lastX = virtual_x;
      lastY = virtual_y;
      
      if (dist(target.x, target.y, virtual_x, virtual_y) < target.w/2){ 
        hits++;
        if(current_distance === -1){
          append(fitts_IDs,0);
        }
        else{
           append(fitts_IDs,Math.log2(current_distance/(target.w)+1));
        }
      }
      else{
        misses++;
        append(fitts_IDs,-1);
      }
      
      current_trial++;                 // Move on to the next trial/target
    }

   // Check if the user has completed all 54 trials
if (current_trial === trials.length)
{
  testEndTime = millis();
  draw_targets = false;          // Stop showing targets and the user performance results
  printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
  attempt++;                      
     
  // If there's an attempt to go create a button to start this
  if (attempt < 2)
  {
    continue_button = createButton('START 2ND ATTEMPT');
    continue_button.mouseReleased(continueTest);
    continue_button.position(width/2 -     continue_button.size().width/2, height/2 - continue_button.size().height/2);
  }
}
// Check if this was the first selection in an attempt
else if (current_trial === 1) testStartTime = millis();  }
}

// Draw target on-screen
function drawTarget(i)
{
  // Get the location and size for target (i)
  let target = getTargetBounds(i);             

  let inn = 0;
  
  
  // Check whether this target is the target the user should be trying to select
  if (trials[current_trial] === i) 
  { 
    // Highlights the target the user should be trying to select
    // with a white border
    stroke(color(255,0,0));
    strokeWeight(2);
    
    // Remember you are allowed to access targets (i-1) and (i+1)
    // if this is the target the user should be trying to select
    //
  }
  // Does not draw a border if this is not the target the user
  // should be trying to select
  else noStroke();

  // Draws the target
  if(trials[current_trial] === i){
    let coords = getSquare();
    let virtual_x = coords[0];
    let virtual_y = coords[1];
    if (dist(target.x, target.y, virtual_x, virtual_y) < target.w/2){
      inn = 1;
      fill(color(255,0,0)); 
    }
    else{
      fill(color(0,255,0));   
    }              
    circle(target.x, target.y, target.w);
    if(trials[current_trial+1] === i){
      fill(color(0,120,0)); 
      circle(target.x, target.y,target.w/2);
    }
    stroke(color(255,0,0));
    strokeWeight(5);
  }
  else if(trials[current_trial+1] === i)
    {
      if(trials[current_trial]!==i){
        fill(color(0,120,0));                 
        circle(target.x, target.y, target.w);
      }
    }
  else{
    fill(color(155,155,155));                 
    circle(target.x, target.y, target.w);
  }
  let distancia = real_distance();
  current_target = getRealXY(target.x,target.y);
  strokeWeight(2);
  if (inn === 1){
    fill(color(255,0,0)); 
    rect(current_target[0] - distancia/2, current_target[1] - distancia/2, distancia,distancia);
  }
  else if(trials[current_trial] === i){
    fill(color(0,255,0));
    rect(current_target[0] - distancia/2, current_target[1] - distancia/2, distancia,distancia);
    if(trials[current_trial + 1] === i){
      fill(color(0,120,0));
      noStroke();
      rect(current_target[0] - distancia/4, current_target[1] - distancia/4, distancia/2,distancia/2);
    }
  }
  else{
    stroke(color(0,0,0));
    rect(current_target[0] - distancia/2, current_target[1] - distancia/2, distancia,distancia);
  }
  strokeWeight(5);
  drawLines();
}

// Returns the location and size of a given target
function getTargetBounds(i)
{
  var x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest()
{
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);
  
  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];
  
  continue_button.remove();
  
  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();  
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
    
  let display    = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI            = display.ppi;                        // calculates pixels per inch
  PPCM           = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE    = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN         = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING   = width/3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;        

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING    = height/2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;
  
  // Defines the user input area (DO NOT CHANGE!)
  inputArea      = {x: width/2 + 2 * TARGET_SIZE,
                    y: height/2,
                    w: width/3,
                    h: height/3
                   }

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea()
{
  noFill();
  stroke(color(220,220,220));
  strokeWeight(2);
  
  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}


//Function that calculates the position of a XY pair in the input area

function getRealXY(X_virtual, Y_virtual){
  X_real = map(X_virtual, 0,width,inputArea.x, inputArea.x + inputArea.w);
  Y_real = map(Y_virtual, 0,width,inputArea.y, inputArea.y + inputArea.w);
  return [X_real,Y_real];
}


//Function that calculates the position of the virtual cursor after snapping

function getSquare(){
  let targetDist1 = getTargetBounds(0);
  let targetDist2 = getTargetBounds(1);
  
  let distancia = real_distance();
  
  let erro = -1;
  let close_target;
  
  for(let i = 0;i<18;i++){
    target = getTargetBounds(i);
    real_target = getRealXY(target.x,target.y);
    if(erro === -1){
      erro = dist(mouseX,mouseY,real_target[0],real_target[1]);
      close_target = target;
    }
    if(erro > dist(mouseX,mouseY,real_target[0],real_target[1])){
      erro = dist(mouseX,mouseY,real_target[0],real_target[1]);
      close_target = target;
    }
  }
  return [close_target.x,close_target.y];
}


//This function draws all the lines in the screen
//2 on the virtual screen:
//virtual mouse -> current target
//current target -> next target
//1 on the input screen:
//mouse position -> position of target on the input area where the virtual cursor would be snapped to the center of the current target

function drawLines(){
  current_target = getTargetBounds(trials[current_trial]);
  next_target = current_target;
  if(current_trial < 53){
    next_target = getTargetBounds(trials[current_trial+1]);
  }
  realTarget = getRealXY(current_target.x,current_target.y);
  stroke(color(255,0,0));
  strokeWeight(2);
  line(mouseX,mouseY,realTarget[0],realTarget[1]);
  coords = getSquare();
  strokeWeight(5);
  line(current_target.x,current_target.y,coords[0],coords[1]);
  stroke(color(0,120,0));
  line(current_target.x,current_target.y,next_target.x,next_target.y);
}

function real_distance(){
  let targetDist1 = getTargetBounds(0);
  let targetDist2 = getTargetBounds(1);
  
  real_target_1 = getRealXY(targetDist1.x,targetDist1.y);
  real_target_2 = getRealXY(targetDist2.x,targetDist2.y);
  return dist(real_target_1[0], real_target_1[1], real_target_2[0], real_target_2[1]);
}
