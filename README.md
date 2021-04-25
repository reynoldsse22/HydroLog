# HydroLog
HydroLog measures and tracks a users daily and monthly water intake. 

To account for the weight of the cup as a tare, the user can choose to weigh
and register a cup to subtract from future measurements.
Given the user's inputted goal, the progress bar updates to reflect current status and a
congratulatory message is displayed when that goal is met.
The user also has the option to reset all progress and shut down the program.
The user's data is backed up to a Google Firestore nonSQL database for data permanence.


# DEPENDENCIES
1.	Firebase – Command: npm install firebase-admin –save
2.	I2c bus – Command: npm install i2c-bus
3.	HX711 – Command: npm install @shroudedcode/hx711
4.	Sleep – Command: npm install sleep
5.	GPIO – Command: npm install pigpio

To use this project, you must create your own Google Cloud Firestone database.
To do this: 
1.   Create a new Firebase project using a valid Google Account.
2.   Add an application to the project that will connect to the database.
     I chose a web app since this program runs on javascript and node.js and named the app “HydroLog – IoT”. 
3.	 In your project, create a collection and a document inside that collection. Take note of the names you give them.
4.   Add the following fields to the document and initialize them to the value shown:
        congratulated: false
        currentCup: 0
        currentDay: <current day of the month> (1-31)
        currentMonth: <current month of the year> (1-12)
        goal: <standard goal) (suggestion of 75)
        progress: 0
        totalDailyWeight: 0
        totalMonthlyWeight: 0

5. In the project’s code, fill in the configuration variable with your application and project’s information:
    var firebaseConfig = {
        apiKey: "<your apiKey>",
        authDomain: "<projectId>.firebaseapp.com",
        databaseURL: "https://<projectId>.firebaseio.com",
        projectId: "<projectId>",
        storageBucket: "<projectId>.appspot.com",
        messagingSenderId: "<messagingSenderId>",
        appId: "<appId>",
        measurementId: "<measurementId>"
    };
Enter in your Firestore project's collection name and document name in any snippet of code
that specifies the collection and document name. It shows up in the initialization section of 
the program’s code as well as the updateDatabase() method.


