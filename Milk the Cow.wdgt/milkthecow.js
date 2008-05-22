// Milk the Cow
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/
//
//This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

var api_key = "127d19adab1a7b6922d8dfda3ef09645";
var shared_secret = "503816890a685753";
var debug = false;

var methurl = "http://api.rememberthemilk.com/services/rest/";
var authurl = "http://www.rememberthemilk.com/services/auth/";

var frob;
var toekn;
var timeline;
var user_id;
var user_username;
var user_fullname;

var tasks = [];
var lastTrans = null;

// JavaScript interval timer to refresh
var updateRefreshInterval;

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
	$("#loading").ajaxStart(function(){
		$(this).show();
	});
	$("#loading").ajaxStop(function(){
		//$(this).hide();
		$(this).fadeOut("slow");
	});
	
    refresh();
    
	//setup Apple buttons
	new AppleGlassButton(document.getElementById("done"), "Done", showFront);
	new AppleInfoButton(document.getElementById("info"), document.getElementById("front"), "white", "black", showBack);
	new AppleButton(document.getElementById("tasks_button"),"Refresh",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,refresh);
	new AppleButton(document.getElementById("del_button"),"Delete Last",20,"Images/button_left.png","Images/button_left_clicked.png",5,"Images/button_middle.png","Images/button_middle_clicked.png","Images/button_right.png","Images/button_right_clicked.png",5,rtmDeleteLast);
	
	//startRefreshTimer();
}

function startRefreshTimer()
{
    refresh();
    if (!updateRefreshInterval)
        updateRefreshInterval = setInterval(refresh, 1000);
}

function stopRefreshTimer()
{
    if (updateRefreshInterval) {
        clearInterval(updateRefreshInterval);
        updateRefreshInterval = null;
    }
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
	//stopRefreshTimer();
	widget.setPreferenceForKey(null, "token");
	widget.setPreferenceForKey(null, "timeline");
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
	//stopRefreshTimer();
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
	//startRefreshTimer();
	refresh();
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
	token = widget.preferenceForKey("token");
    timeline = widget.preferenceForKey("timeline");
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
    var res = rtmCall({method:"rtm.auth.getFrob"});
    log("frob: "+res.rsp.frob);
    if(res.rsp.stat == "ok") {
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

//add task to rtm
function rtmAdd (name){
	var res = rtmCall({method:"rtm.tasks.add",name:name,parse:"1"}).rsp;
	if (res.stat=="ok"&&res.transaction.undoable==1) lastTrans = res.transaction.id;
	refresh();
	return res.stat=="ok"?true:false;
}

//complete tasks[t]
function rtmComplete (t){
	var res = rtmCall({method:"rtm.tasks.complete",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id}).rsp;
	if (res.stat=="ok"&&res.transaction.undoable==1) lastTrans = res.transaction.id;
	refresh();
	return res.stat=="ok"?true:false;
}

function rtmDeleteLast (){
	var last = tasks[tasks.length-1];
	var res = rtmCall({method:"rtm.tasks.delete",list_id:last.list_id,taskseries_id:last.id,task_id:last.task.id}).rsp;
	if (res.stat=="ok"&&res.transaction.undoable==1) lastTrans = res.transaction.id;
	refresh();
	return res.stat=="ok"?true:false;
}

function rtmUndo (){
    log(lastTrans);
	var res = rtmCall({method:"rtm.transactions.undo",transaction_id:lastTrans}).rsp;
	lastTrans = null;
	refresh();
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
    if (window.widget) widget.setPreferenceForKey(token, "token");
    log("token: "+token);
    log("user_id: "+user_id);
    log("user_username: "+user_username);
    log("user_fullname: "+user_fullname);
	return createTimeline();
}

function checkToken (){
	if (window.widget){
		if (typeof(widget.preferenceForKey("token"))=="undefined") return getAuthToken();
		token = widget.preferenceForKey("token");
		timeline = widget.preferenceForKey("timeline");
	}
    var auth = rtmCall({method:"rtm.auth.checkToken"}).rsp;
    if (auth.stat=="ok") return true;
    return getAuthToken();
}

function createTimeline (){
    var res = rtmCall({method:"rtm.timelines.create"}).rsp;
	if (res.stat!="ok") return false;
	timeline = res.timeline;
	if (window.widget) widget.setPreferenceForKey(timeline, "timeline");
	log("timeline: "+timeline);
	return true;
}

function refresh (){
    tasks = [];
    if (!checkToken()){
		//show auth link
		$("#authDiv").show();
		$("#listDiv").hide();
		if (window.widget) $("#authDiv").html("<span id=\"authurl\" onclick=\"widget.openURL('"+rtmAuthURL("delete")+"')\">Click Here</span> to authentication.");
		else $("#authDiv").html("<a id=\"authurl\" target=\"_blank\" href=\""+rtmAuthURL("delete")+"\">Click Here</a> to authentication.");
	}else{
		//get task list
		$("#authDiv").hide();
		$("#listDiv").show();
		var temptasks = rtmCall({method:"rtm.tasks.getList",filter:"status:incomplete"});
		temptasks = temptasks.rsp.tasks;
		if (temptasks.length!=0){ //no tasks
			if (typeof(temptasks.list.length)=="undefined"){ //only one list
				if (typeof(temptasks.list.taskseries.length)=="undefined") //only one task
					addTask(temptasks.list.taskseries,temptasks.list.id);
				else
					for (var s in temptasks.list.taskseries) //for each task
						addTask(temptasks.list.taskseries[s],temptasks.list.id);
			}else{
				for (var l in temptasks.list){ //for each list
					if (typeof(temptasks.list[l].taskseries.length)=="undefined") //only one task
						addTask(temptasks.list[l].taskseries,temptasks.list[l].id);
					else
						for (var s in temptasks.list[l].taskseries) //for each task
							addTask(temptasks.list[l].taskseries[s],temptasks.list[l].id);
				}
			}
		}
    }
	tasks.sort(sortTasks);
	$("#taskList").empty();
	for (var t in tasks){
		log(tasks[t].name);
        var date = tasks[t].date.toString().split(" ");
        var sdate = date[1]+" "+date[2];
		var d = new Date();
		var today = new Date(d.getFullYear(),d.getMonth(),d.getDate());
		var tmr = new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
		var week = new Date(d.getFullYear(),d.getMonth(),d.getDate()+7);
		if (tasks[t].date>=today&&tasks[t].date<tmr)
			sdate = "Today"; //Today
		if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==1)
			sdate = tasks[t].date.format("ddd"); //Within a week, short day
		if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==0)
			sdate = tasks[t].date.format("dddd"); //Within a week, long day
        if (tasks[t].task.has_due_time==1)
			sdate += " @ "+ tasks[t].date.format("h:MM TT");
		if (tasks[t].date.getTime()==2147483647000)
			sdate = ""; //no due date
		$("#taskList").append("<li><input type=\"checkbox\" onclick=\"rtmComplete("+t+")\"/>"+tasks[t].name+"<span class=\"duedate\">"+sdate+"</span></li>");
	}
	
	if (lastTrans==null) $("#undo").hide();
	else $("#undo").show();
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

function inputKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			rtmAdd(document.getElementById('taskinput').value);
			document.getElementById('taskinput').value = '';
			break;
	}
}

//setISO8601 function by Paul Sowden (http://delete.me.uk/2005/03/iso8601.html)
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

//debug
function log (s){
    if (debug) alert(s);
}