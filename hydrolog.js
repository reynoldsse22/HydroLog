/*
* Program: HydroLog.js
* Author: Samuel Reynolds
* Date: 04/24/2021
* Course: CSCI-4677
* Description: HydroLog measures and tracks a users daily and monthly water intake.
*	To account for the weight of the cup as a tare, the user can choose to weigh
*	and register a cup to subtract from future measurements.
*	Given the user's inputted goal, the progress bar updates to reflect current status and a
*	congratulatory message is displayed when that goal is met.
*	The user also has the option to reset all progress and shut down the program.
*	The user's data is backed up to a Google Firestor nonSQL database for data permanence.
*	Enjoy!
*/

		/* Requirements */

//Firebase
var firebase = require("firebase/app");
require("firebase/firestore");
//OLED
const i2c = require('i2c-bus'),
  i2cBus = i2c.openSync(1),
  oled = require('oled-i2c-bus');
//HX711
const hx711 = require('@shroudedcode/hx711')
//Misc.
const font = require('oled-font-5x7');
const sleep = require('sleep');
//GPIO joystick button
const Gpio = require('pigpio').Gpio;

		/* End Requirements */


		/* Firestore Config */
var firebaseConfig = {
    apiKey: "",
    authDomain: "<projectId>.firebaseapp.com",
    databaseURL: "https://<projectId>.firebaseio.com",
    projectId: "",
    storageBucket: "<projectId>.appspot.com",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collectionData = db.collection('<collection>').doc('<document>');

		/* End Firestore Config */


		/* OLED Config */
const opts = {
  width: 128,  		//width of the oled display
  height: 64,		//height of the oled display
  address: 0x3C		//address on the bus for I2C communication
};
const statDisplay = new oled(i2cBus, opts);

		/* End OLED Config */


		/* HX711 Config */
const sensor = new hx711(18, 16);	//18 = clockPin and 16 = dataPin. Numbering represents the WiringPi Pin numbers on the Pi. Not Broadcom or GPIO numbering. 
var calibration = 442;			//Calibration for the hx711. This is found by calibrating. Number will be different on every hx711. Customize number to match your calibration value.
sensor.setScale(calibration);
sensor.tare();

		/* End HX711 Config */


		/* GPIO config */

const upButton = new Gpio(26, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

const downButton = new Gpio(12, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

const leftButton = new Gpio(16, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

const rightButton = new Gpio(21, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});


const midButton = new Gpio(20, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

const setButton = new Gpio(5, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

const resetButton = new Gpio(6, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.FALLING_EDGE
});

		/* End GPIO config */

		/* Global Variables */
var weighingDrink = false;
var currentWeight = 0;
var currentOZ = 0;
var currentCup = 0;
var currentCupWeight = 0;
var weighingCup = false;
var errorDetected = false;
var congratulated = false;
var progress;
var menu = 0;
var inMenu = false;
var goal;
var tempGoal;
var totalWeight;
var monthlyTotal;
var daysMetGoal = 0;
var currentMonth;
var currentDay;
var daysInMonth;
var monthlyProgress;
var statIndex = 0;
var month = new Array("January", "February", "March",
	"April", "May","June","July","August",
	"September","October","November","December");

		/* End Global Variables */

		/* Program initializers */

/* Initialize global variables from database*/
collectionData.get().then((doc) => {
    if (doc.exists) {
        totalWeight = doc.data().totalDailyWeight;
	monthlyTotal = doc.data().totalMonthlyTotal;
	currentCup = doc.data().currentCup;
	goal = doc.data().goal;
	tempGoal = goal;
	progress = doc.data().progress;
	congratulated = doc.data().congratulated;
	currentMonth = doc.data().currentMonth;
	currentDay = doc.data().currentDay;
	monthlyTotal = doc.data().totalMonthlyWeight;
	daysMetGoal = doc.data().daysMetGoal;
	daysInMonth = doc.data().daysInMonth;
	menu = 0;
	checkDate();
	updateOLED();
    } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
    }
}).catch((error) => {
    console.log("Error getting document:", error);
});


//Code for when the program is first ran. Sets the display
const i2c_bus = i2c.open(1, function(err)
{
    if(err)
    {
        console.log('Error opening I2C bus: ', err);
        process.exit(1);
    }
    startOLED();
    setProgressBar();
});

		/* End Program Initializers */


		/* Functions */

//starts running the oled display
function startOLED() {
    statDisplay.clearDisplay(); 				//make sure the display is cleared before writing to it
    statDisplay.setCursor(20, 1);
    statDisplay.turnOnDisplay();				// turn on the display
    statDisplay.writeString(font, 1, 'Loading...', 1, true);
}

//updates the oled display depending on the menu and global variable data
function updateOLED() {
   switch(menu){
	case 0:
		statDisplay.clearDisplay();
		//Determine which homescreen to show
		if(statIndex == 0){
			totalWeight = parseFloat(totalWeight);
			var weightString = totalWeight.toFixed(2) + " fl oz";
			var weightPadding = setPadding(weightString);
			var headingString = "Today's Log";
			var headingPadding = setPadding(headingString);
			var goalString = 'Goal: ' + goal + " fl oz";
			var goalPadding = setPadding(goalString);
			statDisplay.setCursor(goalPadding, 40);
			statDisplay.writeString(font, 1, goalString, 1, true);
		}
		//show the monthly homescreen if statIndex == 1
		else if(statIndex == 1){
			monthlyTotal = parseFloat(monthlyTotal);
			var weightString = monthlyTotal.toFixed(2) + " fl oz";
			var weightPadding = setPadding(weightString);
			var headingString = month[currentMonth-1] + "'s Log";
			var headingPadding = setPadding(headingString);
			var goalString = "Hit Goal " + daysMetGoal + '/' + daysInMonth + " Days" ;
			var goalPadding = setPadding(goalString);
			statDisplay.setCursor(goalPadding, 40);
			statDisplay.writeString(font, 1, goalString, 1, true);
		}
		setProgressBar();
		statDisplay.setCursor(headingPadding,1);
	        //statDisplay.clearDisplay();
    		statDisplay.writeString(font, 1, headingString, 1, true);
    		statDisplay.setCursor(weightPadding, 18);
    		statDisplay.writeString(font, 1, weightString, 1, true);
	break;
	case 1:
		statDisplay.setCursor(30,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Track Water', 1, true);
		statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Select', 1, true);
		statDisplay.setCursor(75, 55);
                statDisplay.writeString(font, 1, 'Menu 1/5', 1, true);
  	break;
	case 2:
                statDisplay.setCursor(25,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Set New Goal:', 1, true);
		var tempGoalString = tempGoal + ' fl oz';
		var tempGoalPadding = setPadding(tempGoalString);
                statDisplay.setCursor(tempGoalPadding, 25);
                statDisplay.writeString(font, 1, tempGoalString, 1, true);
		statDisplay.setCursor(75, 55);
                statDisplay.writeString(font, 1, 'Menu 2/5', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Confirm', 1, true);
	break;
	case 3:
                statDisplay.setCursor(30,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Set New Cup', 1, true);
		if(currentCup == 0) {
			statDisplay.setCursor(10, 25);
			statDisplay.writeString(font, 1, 'No cup registered', 1, true); 
		}
		else {
			statDisplay.setCursor(30, 20);
			statDisplay.writeString(font, 1, "Current Cup:", 1, true);
			var registerCupString = currentCup.toFixed(2) + ' grams';
			var registerCupPadding = setPadding(registerCupString);
			statDisplay.setCursor(registerCupPadding, 35);
			statDisplay.writeString(font, 1, registerCupString ,1, true);
		}
		statDisplay.setCursor(75, 55);
		statDisplay.writeString(font, 1, 'Menu 3/5', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Select', 1, true);

  	break;
	case 4:
		statDisplay.setCursor(20,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Reset Progress', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Select', 1, true);
                statDisplay.setCursor(75, 55);
                statDisplay.writeString(font, 1, 'Menu 4/5', 1, true);
	break;
	case 5:
                statDisplay.setCursor(12,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 2, 'Shut Down', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Select', 1, true);
                statDisplay.setCursor(75, 55);
                statDisplay.writeString(font, 1, 'Menu 5/5', 1, true);
	break;
	case 6:
	/* Switch location of confirm and back buttons so that confirm doesn't get hit 
		on accident. */
		statDisplay.setCursor(22,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Are You Sure?', 1, true);
		statDisplay.setCursor(5, 55);
                statDisplay.writeString(font, 1, 'Back', 1, true);
                statDisplay.setCursor(100, 55);
                statDisplay.writeString(font, 1, 'Yes', 1, true);
	break;
	case 7:
	/* Switch location of confirm and back buttons so that confirm doesn't get hit 
		on accident. */
                statDisplay.setCursor(22,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Are You Sure?', 1, true);
                statDisplay.setCursor(5, 55);
                statDisplay.writeString(font, 1, 'Back', 1, true);
                statDisplay.setCursor(100, 55);
                statDisplay.writeString(font, 1, 'Yes', 1, true);
	break;
	case 8:
		statDisplay.setCursor(10,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Set Drink on Scale', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Track', 1, true);
                statDisplay.setCursor(90, 55);
                statDisplay.writeString(font, 1, 'Return', 1, true);
	break;
	case 9:
		statDisplay.setCursor(20,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Confirm Drink?', 1, true);
                statDisplay.setCursor(5, 55);
                statDisplay.writeString(font, 1, 'Yes', 1, true);
                statDisplay.setCursor(115, 55);
                statDisplay.writeString(font, 1, 'No', 1, true);
		currentOZ = currentWeight/29.57353;			//convert drink from grams to fluid ounces
		currentOZ = parseFloat(currentOZ.toFixed(2));		//Truncate the conversion to 2 decimal places
		var cup = currentCup/29.57353;				//convert the cup from grams to fluid ounces for easy subtraction as a tare
		cup = cup.toFixed(2);					//Truncate the cup to two decimal places
		cup = parseFloat(cup);					//since toFixed() returns a string, parse the value back to a float
		currentOZ -= cup;					//subtract the cup from the drink as a tare
		currentOZ = currentOZ.toFixed(2);			//truncate to two decimal places to be safe
               	currentOZ = parseFloat(currentOZ);			//parse back to a float
		if(currentOZ < 0) {
			currentOZ = 0;
		}
		var currentOzString = currentOZ + ' fl oz';
		var currentOzPadding = setPadding(currentOzString);
		statDisplay.setCursor(currentOzPadding, 25);
        	statDisplay.writeString(font, 1, currentOzString, 1, true);
	break;
	case 10:
                statDisplay.setCursor(13,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Set Cup on Scale', 1, true);
                statDisplay.setCursor(1, 55);
                statDisplay.writeString(font, 1, 'Register', 1, true);
                statDisplay.setCursor(90, 55);
                statDisplay.writeString(font, 1, 'Return', 1, true);

        break;
        case 11:
		statDisplay.setCursor(15,1);
                statDisplay.clearDisplay();
                statDisplay.writeString(font, 1, 'Confirm New Cup?', 1, true);
                statDisplay.setCursor(5, 55);
                statDisplay.writeString(font, 1, 'Yes', 1, true);
                statDisplay.setCursor(115, 55);
                statDisplay.writeString(font, 1, 'No', 1, true);
                weighingCup = true;
		currentCupWeight = currentCupWeight.toFixed(4);			//truncate the cup to 4 decimal places
               	var currentCupString = currentCupWeight + ' grams';
               	var currentCupPadding = setPadding(currentCupString);
               	statDisplay.setCursor(currentCupPadding, 25);
               	statDisplay.writeString(font, 1, currentCupString, 1, true);
    	break;
	case 12:
                statDisplay.setCursor(1,1);
                statDisplay.clearDisplay();
                statDisplay.setCursor(15, 20);
                statDisplay.writeString(font, 1, 'No drink detected', 1, true);
                statDisplay.setCursor(90, 55);
                statDisplay.writeString(font, 1, 'Return', 1, true);

	break;
	case 13:
		statDisplay.setCursor(1,1);
                statDisplay.clearDisplay();
		//if there is no cup registeres, there shouldn't be an option to set the cup to 0.
		if(currentCup != 0){
                statDisplay.setCursor(15, 1);
	                statDisplay.writeString(font, 1, 'No cup detected', 1, true);
			statDisplay.setCursor(25, 25);
			statDisplay.writeString(font, 1, 'Remove cup?', 1, true);
			statDisplay.setCursor(1, 55);
			statDisplay.writeString(font, 1, 'Confirm', 1, true);
                	statDisplay.setCursor(90, 55);
                	statDisplay.writeString(font, 1, 'Return', 1, true);
		} else {
			statDisplay.setCursor(15, 20);
                	statDisplay.writeString(font, 1, 'No cup detected', 1, true);
                	statDisplay.setCursor(90, 55);
                	statDisplay.writeString(font, 1, 'Return', 1, true);
		}
	break;
	case 14:
		statDisplay.setCursor(15,1);
		statDisplay.clearDisplay();
		statDisplay.writeString(font, 1, 'Congratulations!', 1, true);
		statDisplay.setCursor(15, 16);
		statDisplay.writeString(font, 1, 'You reached your', 1, true);
		statDisplay.setCursor(24, 28);
		statDisplay.writeString(font, 1, 'daily goal of', 1, true);
		var congratsPadding = setPadding(goal + ' fl oz');
		statDisplay.setCursor(congratsPadding, 40);
		statDisplay.writeString(font, 1, goal + ' fl oz', 1, true);
	break;
	default:
		statDisplay.clearDisplay();
	break;
    }
}

//Sets the progress bar depending on the amount of progress compared to the overal daily goal
function setProgressBar() {
    monthlyProgress = daysMetGoal/daysInMonth;
    monthlyProgress = Math.round(monthlyProgress * 100, 0);
    var barLength = 1;
    if(statIndex == 1){
        if(monthlyProgress > 0){
		barLength = monthlyProgress * .9;          //divide by 9/10 since the progress bar is only 90 pixels wide
	}
 	statDisplay.setCursor(90, 55);
	statDisplay.writeString(font, 1, '| ' + monthlyProgress + '%', 1, true);
    }
    else if (statIndex == 0){
	if(progress > 0) {
		barLength = progress * .9;
	}
	statDisplay.setCursor(90, 55);
    	statDisplay.writeString(font, 1, '| ' + progress + '%', 1, true);
    }
    barLength = Math.round(barLength);
    if(barLength > 90){                     //if over 90 pixels, max out at 90 to prevent overwriting pixels
          barLength = 90;
    }
    statDisplay.setCursor(1,1);
    statDisplay.drawLine(1, 55, barLength, 55, 1);
    statDisplay.drawLine(1, 56, barLength, 56, 1);
    statDisplay.drawLine(1, 57, barLength, 57, 1);
    statDisplay.drawLine(1, 58, barLength, 58, 1);
    statDisplay.drawLine(1, 59, barLength, 59, 1);
    statDisplay.drawLine(1, 60, barLength, 60, 1);
    statDisplay.drawLine(1, 61, barLength, 61, 1);
}


//Returns the correct padding integer for a given string less than 128 pixels wide
function setPadding(inputString){
	var length = inputString.length;
	length = length * 6;
	length -= 2;
	length = length/2;
	length += 1;
	length = 64 - length;
	if ( length < 0) {
		return -1;
	}
	return length; 
}

//Updates the database with the needed global variable data
function updateDatabase(){
    db.collection("<collection>").doc("<document>").set({
	congratulated: congratulated,
	currentCup: currentCup,
	goal: goal,
	progress: progress,
    	totalDailyWeight: totalWeight,
	currentMonth: currentMonth,
	currentDay: currentDay,
	daysMetGoal: daysMetGoal,
	totalMonthlyWeight: monthlyTotal,
	daysInMonth: daysInMonth
    })
}

//Resets the needed data in the database back to zero
function resetDatabase() {
    progress = 0;
    totalWeight = 0;
    currentCup = 0;
    currentWeight = 0;
    monthlyTotal = 0;
    congratulated = false;
    daysMetGoal = 0;
    monthlyProgress = 0;
    daysMetGoal = 0;
    updateDatabase();
}

//Determines if values need to be reset if a new day or month has passed
function checkDate(){
    var testDate = new Date();
    var testMonth = testDate.getMonth() + 1;
    var testYear = testDate.getFullYear();
    daysInMonth = new Date(testYear, testMonth, 0).getDate();		//returns the number of days in the current month
    daysInMonth = parseInt(daysInMonth);
    if(currentMonth != testMonth) {					//If the current month does not match last recorded month. A new month has passed
	monthlyTotal = 0;
	currentMonth = testMonth;
	daysMetGoal = 0;
	updateOLED();
    }
    var testDay = testDate.getDate();
    if(currentDay != testDay) {						//If the current day does not match last recorded day. A new day has passed
	totalWeight = 0;
	currentDay = testDay;
	progress = 0;
	updateOLED();
    }
    updateDatabase();
}


		/* End Functions */

downButton.glitchFilter(100000);
leftButton.glitchFilter(100000);
rightButton.glitchFilter(100000);
upButton.glitchFilter(100000);
midButton.glitchFilter(100000);
setButton.glitchFilter(100000);
resetButton.glitchFilter(100000);

		/* Event Listeners */

//Up button event listener
upButton.on('interrupt', function(level) {
    if(menu == 2) {
	inAction = true;
	tempGoal += 5;		//increment the goal by 5
    }
    setTimeout(function(){
	updateOLED();
    },100);
});

//Down button event listener
downButton.on('interrupt', function(level) {
    if(menu == 2) {
	inAction = true;
        tempGoal -= 5;		//decrement the goal by 5
    }
    setTimeout(function(){
	updateOLED();
    },100);
});

//Left button event listener
leftButton.on('interrupt', function(level) {
    if(inMenu) {
	if(menu > 1){
	   menu--;
	}
	else {
	   menu = 5;
	}
    }
    else if(menu == 0){
	if(statIndex == 1){
	    statIndex = 0;
	}
	else if(statIndex == 0){
	    statIndex = 1;
	}
    }
    setTimeout(function(){
	updateOLED();
    },100);
});

//Right button event listener
rightButton.on('interrupt', function(level) {
    if(inMenu){
	if(menu < 5){
           menu++;
        }
        else {
           menu = 1;
        }
    }
    else if(menu == 0){
        if(statIndex == 1){
            statIndex = 0;
        }
        else if(statIndex == 0){
            statIndex = 1;
        }
    }
    setTimeout(function(){
	updateOLED();
    },100);
});

//Middle button event listener
midButton.on('interrupt', function(level) {
    if(menu == 0) {
	menu = 1;
        inMenu = true;
    }
    else if(menu > 0 && menu < 6){
	menu = 0;
	inMenu = false;
    }
    else if(menu == 14)
    {
	menu = 0;
        inMenu = false;
    }
    setTimeout(function(){
	updateOLED();
    },100);
});

//Set button event listener
setButton.on('interrupt', function(level) {
    switch(menu) {
	case 1:
		menu = 8;
	break;
	case 2:
		goal = tempGoal;
        	menu = 0;
		progress = totalWeight/goal;
		progress = Math.round(progress * 100, 0);
		updateDatabase();
	break;
	case 3:
		menu = 10;
	break;
	case 4:
		menu = 6;
	break;
	case 5:
		menu = 7;
	break;
	case 6:
		menu = 0;
		inMenu = false;
	break;
	case 7:
		menu = 0;
		inMenu = false;
	break;
	case 8:
		weighingDrink = true;
                currentWeight = sensor.getUnits();
                if(currentWeight < .3) {
                        currentWeight = 0;
                        errorDetected = true;
			menu = 12;
                }
		else {
			menu = 9;
		}
	break;
	case 9:
		weighingDrink = false;
        	totalWeight = parseFloat(totalWeight);
        	currentOZ = parseFloat(currentOZ);
        	totalWeight += currentOZ;
		totalWeight = totalWeight.toFixed(2);
		totalWeight = parseFloat(totalWeight);
		monthlyTotal += currentOZ;
		monthlyTotal = monthlyTotal.toFixed(2);
		monthlyTotal = parseFloat(monthlyTotal);
    		progress = totalWeight / goal;
		progress = Math.round(progress * 100, 0);
		if(totalWeight >= goal && congratulated == false){
			menu = 14;
			daysMetGoal += 1;
			congratulated = true;
		}
		else {
			menu = 0;
			inMenu = false;
		}
		updateDatabase();
	break;
	case 10:
		weighingCup = true;
                currentCupWeight = sensor.getUnits();
                if(currentCupWeight < .3) {
                        currentCupWeight = 0;
                        errorDetected = true;
                        menu = 13;
                }
                else {
                        menu = 11;
                }
	break;
	case 11:
		currentCup = parseFloat(currentCupWeight);
        	currentCup = currentCup.toFixed(4);
		currentCup = parseFloat(currentCup);
		weighingCup = false;
        	menu = 0;
        	inMenu = false;
		updateDatabase();
	break;
	case 13:
		currentCup = 0;
		updateDatabase();
		menu = 3;
		updateOLED();
	break;
	case 14:
	        menu = 0;
        	inMenu = false;
	break;
    }
    setTimeout(function(){
	updateOLED();
    },250);
});

//Reset button event listener
resetButton.on('interrupt', function(level) {
    switch(menu){
	case 2:
		if(inMenu){
			tempGoal = goal;
        		menu = 0;
        		inMenu = false;
		}
	break;
	case 6:
		resetDatabase();
                inMenu = false;
                menu = 0;
	break;
	case 7:
		process.emit('SIGINT');		//shutdown
	break;
	case 8:
		menu = 1;
        	inMenu = true;
	break;
	case 9:
		if(errorDetected == true) {
			menu = 1;
        		inMenu = true;
		}
		else {
			weighingDrink = false;
                        totalWeight -= currentOZ;
			monthlyTotal -= currentOZ;
                        menu = 8;
                        errorDetected = false;
		}
	break;
	case 10:
		menu = 3;
                inMenu = true;
	break;
	case 11:
		if(errorDetected == true) {
                        menu = 10;
                        errorDetected = false;
                }
                else {
                        weighingCup = false;
			currentCup = 0;
                        menu = 10;
                        errorDetected = false;
                }
	break;
	case 12:
		errorDetected = false;
		menu = 8;
	break;
	case 13:
		errorDetected = false;
		menu = 10;
	break;
	case 14:
	        menu = 0;
        	inMenu = false;
	break;
    }
    setTimeout(function(){
	updateOLED();
    },250);
});

		/* End Event Listeners */

//Display goodbye when exit has been detected
process.on('SIGINT', function()
{
	statDisplay.clearDisplay();
	statDisplay.setCursor(20,1);
	statDisplay.writeString(font, 2, 'Goodbye!', 1, true);
	statDisplay.setCursor(40, 35);
	statDisplay.writeString(font, 1, 'HydroLog', 50, true);
	statDisplay.setCursor(18, 45);
	statDisplay.writeString(font, 1, 'Samuel Reynolds', 50, true);
	statDisplay.setCursor(52, 55);
	statDisplay.writeString(font, 1, '2021', 50, true);
	setTimeout(function(){
		statDisplay.clearDisplay();
	},3000);

	setTimeout(function(){
		statDisplay.turnOffDisplay();
		process.exit();
	},3050);
});

