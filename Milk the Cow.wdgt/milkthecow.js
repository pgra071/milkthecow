// Milk the Cow
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/

var api_key = "127d19adab1a7b6922d8dfda3ef09645";
var shared_secret = "503816890a685753";
var debug = true;

var methurl = "http://api.rememberthemilk.com/services/rest/";
var authurl = "http://www.rememberthemilk.com/services/auth/";

var frob;
var toekn;
var user_id;
var user_username;
var user_fullname;

var tasks = [];

//Apple Buttons
var gInfoButton;
var gDoneButton;
var gAuthButton;
var gTokenButton;
var gTasksButton;

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    $.ajaxSetup({
		async:false,
		type:"GET",
		beforeSend: function (req) { req.setRequestHeader("Cache-Control", "no-cache");  }
	});
    
    log(checkToken());
    
    printTasks();
    
    //log(rtmCall({method:"rtm.test.echo"}).rsp.method);
    //log(rtmCall({method:"rtm.auth.getFrob"}).rsp.frob);
    
	//setup Apple buttons
	gDoneButton = new AppleGlassButton(document.getElementById("done"), "Done", showFront);
	gInfoButton = new AppleInfoButton(document.getElementById("info"), document.getElementById("front"), "white", "black", showBack);
	gAuthButton = new AppleButton(document.getElementById("auth_button"),"Authentication",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,OpenAuthUrl);
	gTokenButton = new AppleButton(document.getElementById("token_button"),"checkToken",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,checkToken);
	gTasksButton = new AppleButton(document.getElementById("tasks_button"),"printTasks",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,printTasks);
}

function OpenAuthUrl (){
    widget.openURL(rtmAuthURL("delete")); //this also gets frob
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
    // Stop any timers to prevent CPU usage
    // Remove any preferences as needed
    // widget.setPreferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
    // Stop any timers to prevent CPU usage
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
    // Restart any timers that were stopped on hide
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
    // Retrieve any preference values that you need to be synchronized here
    // Use this for an instance key's value:
    // instancePreferenceValue = widget.preferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
    //
    // Or this for global key's value:
    // globalPreferenceValue = widget.preferenceForKey(null, "your-key");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) {
        widget.prepareForTransition("ToBack");
    }

    front.style.display = "none";
    back.style.display = "block";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) {
        widget.prepareForTransition("ToFront");
    }

    front.style.display="block";
    back.style.display="none";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
}

if (window.widget) {
    widget.onremove = remove;
    widget.onhide = hide;
    widget.onshow = show;
    widget.onsync = sync;
}

//make rtm requests, return a json object
function rtmCall (data) {
	if(typeof(data) != "object") return "Need a data object";
	if(typeof(data.method) == "undefined") return "Need a method name";
    
    data.api_key = api_key;
	data.format = "json";
    rtmSign(data);
    
    var json = eval("("+$.ajax({
		url: methurl,
		data: data
	}).responseText+")");
    
    return json;
}

//sign rtm requests
function rtmSign (args) {
    var arr = [];
    var str = shared_secret;
    
    for (var e in args) arr.push(e);
    arr.sort();
    
    for (var i=0;i<arr.length;i++) str+=arr[i]+args[arr[i]];
    var sig = String(hex_md5(str));
    
    //log("signstr: "+str);
    //log("signsig: "+sig);
    
    args.api_sig = sig;
}

function rtmGetFrob () {
    //if (typeof(widget.preferenceForKey("frob"))!="undefined") return widget.preferenceForKey("frob");
    var res = rtmCall({method:"rtm.auth.getFrob"});
    log("frob: "+res.rsp.frob);
    if(res.rsp.stat == "ok") {
		//widget.setPreferenceForKey(res.rsp.frob, "frob");
		return res.rsp.frob;
	}
    return "fail"; //failures
}

//create auth url
function rtmAuthURL (perms) {
    var url = authurl+"?";
    frob = rtmGetFrob();
    var data = {api_key:api_key,perms:perms,frob:frob};
    rtmSign(data);
    for (var a in data) url+= a + "=" + data[a] +"&";
    return url;
}

function getAuthToken (){
    var auth = rtmCall({method:"rtm.auth.getToken",frob:frob}).rsp;
    if (auth.stat!="ok") return false;
    auth = auth.auth;
    token = auth.token;
    user_id = auth.user.id;
    user_username = auth.user.username;
    user_fullname = auth.user.fullname;
    widget.setPreferenceForKey(token, "token");
    widget.setPreferenceForKey(user_id, "user_id");
    widget.setPreferenceForKey(user_username, "user_username");
    widget.setPreferenceForKey(user_fullname, "user_fullname");
    log("token: "+token);
    log("user_id: "+user_id);
    log("user_username: "+user_username);
    log("user_fullname: "+user_fullname);
    return true;
}

function checkToken (){
	showLoading();
    if (typeof(widget.preferenceForKey("token"))=="undefined") return getAuthToken();
    token = widget.preferenceForKey("token");
    var auth = rtmCall({method:"rtm.auth.checkToken",auth_token:token}).rsp;
	hideLoading();
    if (auth.stat=="ok") return true;
    return getAuthToken();
}

function printTasks (){
	showLoading();
    tasks = [];
    if (checkToken()){
		var temptasks = rtmCall({method:"rtm.tasks.getList",filter:"status:incomplete",auth_token:widget.preferenceForKey("token")});
		temptasks = temptasks.rsp.tasks;
		if (typeof(temptasks.list.length)=="undefined"){
			if (typeof(temptasks.list.taskseries.length)=="undefined")
				tasks.push(temptasks.list.taskseries);
			else
				for (var s in temptasks.list.taskseries)
					tasks.push(temptasks.list.taskseries[s]);
		}else{
			for (var l in temptasks.list){
				if (typeof(temptasks.list[l].taskseries.length)=="undefined")
					tasks.push(temptasks.list[l].taskseries);
				else
					for (var s in temptasks.list[l].taskseries)
						tasks.push(temptasks.list[l].taskseries[s]);
			}
		}
    }
	tasks.sort(sortTasks);
	$("#taskList").empty();
	for (var t in tasks){
		log(tasks[t].name);
		var date = tasks[t].date.toString().split(" ");
		var sdate = "Due "+date[1]+" "+date[2];
		$("#taskList").append("<li>"+tasks[t].name+"<br/>"+sdate+"</li>");
	}
	hideLoading();
}

function sortTasks (t1, t2){
	var d1 = new Date();
	d1.setISO8601(t1.task.due);
	t1.date = d1;
	var d2 = new Date();
	d2.setISO8601(t2.task.due);
	t2.date = d2;
	return d1-d2;
}

Date.prototype.setISO8601 = function (string) {
	var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
	"(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
	"(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
	var d = string.match(new RegExp(regexp));

	var offset = 0;
	var date = new Date(d[1], 0, 1);

	if (d[3]) { date.setMonth(d[3] - 1); }
	if (d[5]) { date.setDate(d[5]); }
	if (d[7]) { date.setHours(d[7]); }
	if (d[8]) { date.setMinutes(d[8]); }
	if (d[10]) { date.setSeconds(d[10]); }
	if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
	if (d[14]) {
		offset = (Number(d[16]) * 60) + Number(d[17]);
		offset *= ((d[15] == '-') ? 1 : -1);
	}

	offset -= date.getTimezoneOffset();
	time = (Number(date) + (offset * 60 * 1000));
	this.setTime(Number(time));
}

function hideLoading (){
	$("#loading").fadeOut("slow");
}

function showLoading (){
	$("#loading").show();
}

//another debug function
function printCheck(){
    log(checkToken());
}

//debug
function log (s){
    if (debug) alert(s);
}