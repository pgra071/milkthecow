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
var timeline;
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
var gAddButton;
var gDelButton;

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    $.ajaxSetup({
		async:false,
		type:"GET",
		beforeSend: function (req) { req.setRequestHeader("Cache-Control", "no-cache"); }
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
	gTasksButton = new AppleButton(document.getElementById("tasks_button"),"Refresh",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,printTasks);
	gAddButton = new AppleButton(document.getElementById("add_button"),"Add \"test\"",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,rtmAddTest);
	gDelButton = new AppleButton(document.getElementById("del_button"),"Delete Last",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,rtmDeleteLast);
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
	if (typeof(token) != "undefined") data.auth_token = token;
	if (typeof(timeline) != "undefined") data.timeline = timeline;
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

function rtmAddTest(){
    return rtmAdd("test");
}

//add task to rtm
function rtmAdd (name){
	var res = rtmCall({method:"rtm.tasks.add",name:name,parse:"1"}).rsp;
	printTasks();
	return res.stat=="ok"?true:false;
}

function rtmDeleteLast (){
	var last = tasks[tasks.length-1];
	var res = rtmCall({method:"rtm.tasks.delete",list_id:last.list_id,taskseries_id:last.id,task_id:last.task.id}).rsp;
	printTasks();
	return res.stat=="ok"?true:false;
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
	return createTimeline();
}

function checkToken (){
	showLoading();
    if (typeof(widget.preferenceForKey("token"))=="undefined") return getAuthToken();
    token = widget.preferenceForKey("token");
    timeline = widget.preferenceForKey("timeline");
    var auth = rtmCall({method:"rtm.auth.checkToken"}).rsp;
	hideLoading();
    if (auth.stat=="ok") return true;
    return getAuthToken();
}

function createTimeline (){
    var res = rtmCall({method:"rtm.timelines.create"}).rsp;
	if (res.stat!="ok") return false;
	timeline = res.timeline;
	widget.setPreferenceForKey(timeline, "timeline");
	log("timeline: "+timeline);
	return true;
}

function printTasks (){
	showLoading();
    tasks = [];
    if (checkToken()){
		var temptasks = rtmCall({method:"rtm.tasks.getList",filter:"status:incomplete"});
		temptasks = temptasks.rsp.tasks;
		if (typeof(temptasks.list.length)=="undefined"){
			if (typeof(temptasks.list.taskseries.length)=="undefined")
				addTask(temptasks.list.taskseries,temptasks.list.id);
			else
				for (var s in temptasks.list.taskseries)
					addTask(temptasks.list.taskseries[s],temptasks.list.id);
		}else{
			for (var l in temptasks.list){
				if (typeof(temptasks.list[l].taskseries.length)=="undefined")
					addTask(temptasks.list[l].taskseries,temptasks.list[l].id);
				else
					for (var s in temptasks.list[l].taskseries)
						addTask(temptasks.list[l].taskseries[s],temptasks.list[l].id);
			}
		}
    }
	tasks.sort(sortTasks);
	$("#taskList").empty();
	for (var t in tasks){
		log(tasks[t].name);
        var date = tasks[t].date.toString().split(" ");
        var sdate = "Due "+date[1]+" "+date[2];
        if (tasks[t].date.getTime()==2147483647000) sdate = ""; //no due date
		$("#taskList").append("<li>"+tasks[t].name+"<br/>"+sdate+"</li>");
	}
	hideLoading();
}

function addTask (t,list_id) {
    var d = new Date();
    if (t.task.due=="") d.setTime(2147483647000); //no due date
    else d.setISO8601(t.task.due);
    t.date = d;
    log(t.date);
	t.list_id = list_id;
    tasks.push(t);
}

function sortTasks (t1, t2){
	return t1.date-t2.date;
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