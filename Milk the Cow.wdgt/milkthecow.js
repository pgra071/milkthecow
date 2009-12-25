// Milk the Cow
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/
//
// This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

var version = "0.5.0";
var api_key = "127d19adab1a7b6922d8dfda3ef09645";
var shared_secret = "503816890a685753";
//var debug = true;

var methurl = "http://api.rememberthemilk.com/services/rest/";
var authurl = "http://www.rememberthemilk.com/services/auth/";

var frob;
var toekn;
var timeline;
var user_id;
var user_username;
var user_fullname;

// Growl
var growl = false;       // use growl
var growlTimeouts = {};  // a dictionary of taskID -> timeoutID
var growlBefore = 60;    // Number of mintues for default reminder before each task

var tasks = [];
var undoStack = [];      // stack of transaction id
var lists = [];          // user lists for tasks
var detailsOpen = false; // state of details box
var selectedList = "";   // selected list
var currentTask = null;  // the task with details box showing
var editing = false;     // currently editing a field

var hasSettings = false;
// user setting - http://www.rememberthemilk.com/services/api/methods/rtm.settings.getList.rtm
var timezone = "";       // The user's Olson timezone. Blank if the user has not set a timezone.
var dateformat = 1;      // 0 indicates an European date format (e.g. 14/02/06), 1 indicates an American date format (e.g. 02/14/06).
var timeformat = 0;      // 0 indicates 12 hour time with day period (e.g. 5pm), 1 indicates 24 hour time (e.g. 17:00).
var defaultlist = "";    // The user's default list. Blank if the user has not set a default list.
var language = "";       // The user's language (ISO 639-1 code).

// Filter Settings
var magiclist     = "";
var magicpriority = "";
var magicstatus   = "status:incomplete";
var magictext     = "";
var magictags     = "";

var gMyScrollArea, gMyScrollbar;

// variables for widget dimensions
var defaultWidth = 280;
var defaultHeight = 380;
var taskWidth;
var taskHeight;
var detailsWidth = 0;
var resizeOffset;
var minWidth = 280;
var minHeight = 137;

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
	widget.setPreferenceForKey(null, "token");
	widget.setPreferenceForKey(null, "user_id");
	widget.setPreferenceForKey(null, "user_username");
	widget.setPreferenceForKey(null, "user_fullname");
	widget.setPreferenceForKey(null, "timeline");
	widget.setPreferenceForKey(null, "frob");
	
	// User settings
	widget.setPreferenceForKey(null, "timezone");
	widget.setPreferenceForKey(null, "dateformat");
	widget.setPreferenceForKey(null, "timeformat");
	widget.setPreferenceForKey(null, "defaultlist");
	widget.setPreferenceForKey(null, "language");

	// Dimension
	widget.setPreferenceForKey(null, "taskWidth");
	widget.setPreferenceForKey(null, "taskHeight");
	
	// Filter
	widget.setPreferenceForKey(null, "magiclist");
	widget.setPreferenceForKey(null, "magicpriority");
	widget.setPreferenceForKey(null, "magicstatus");
	widget.setPreferenceForKey(null, "magictext");
	widget.setPreferenceForKey(null, "magictags");
	
	// Growl
	widget.setPreferenceForKey(null, "growl");
	widget.setPreferenceForKey(null, "growlBefore");
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
	
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
	$("#loading").hide();
	refresh();
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
	token = widget.preferenceForKey("token");
	user_id = widget.preferenceForKey("user_id");
	user_username = widget.preferenceForKey("user_username");
	user_fullname = widget.preferenceForKey("user_fullname");
	timeline = widget.preferenceForKey("timeline");
	frob = widget.preferenceForKey("frob");
	
	// User settings
	timezone = widget.preferenceForKey("timezone");
	dateformat = widget.preferenceForKey("dateformat");
	timeformat = widget.preferenceForKey("timeformat");
	defaultlist = widget.preferenceForKey("defaultlist");
	language = widget.preferenceForKey("language");
	
	// Dimension
	taskWidth = widget.preferenceForKey("taskWidth");
	taskHeight = widget.preferenceForKey("taskHeight");
	
	// Filter
	magiclist = widget.preferenceForKey("magiclist");
	magicpriority = widget.preferenceForKey("magicpriority");
	magicstatus = widget.preferenceForKey("magicstatus");
	magictext = widget.preferenceForKey("magictext");
	magictags = widget.preferenceForKey("magictags");
	
	// Growl
	growl = widget.preferenceForKey("growl");
	growlBefore = widget.preferenceForKey("growlBefore");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event) {
	window.resizeTo((taskWidth + detailsWidth) > defaultWidth ? (taskWidth + detailsWidth) : defaultWidth, taskHeight > defaultHeight ? taskHeight : defaultHeight);
	if (window.widget) widget.prepareForTransition("ToBack");
	document.getElementById("front").style.display = "none";
	document.getElementById("back").style.display = "block";
	if (window.widget) setTimeout('widget.performTransition();', 0);
	window.resizeTo(defaultWidth, defaultHeight);
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event) {
    // Invoke growlBefore change event if value have been changed
    if (growlBefore != parseInt($("#growlBefore").val())) $("#growlBefore").change();
    
	window.resizeTo((taskWidth + detailsWidth) > defaultWidth ? (taskWidth + detailsWidth) : defaultWidth, taskHeight > defaultHeight ? taskHeight : defaultHeight);
	if (window.widget) widget.prepareForTransition("ToFront");
	document.getElementById("front").style.display="block";
	document.getElementById("back").style.display="none";
	if (window.widget) setTimeout('widget.performTransition();', 0);
	window.resizeTo(taskWidth + detailsWidth, taskHeight);
	refresh();
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

	var r = $.ajax({url: methurl,data: data,dataType:"json"}).responseText;
	log(r);
	return eval("("+r+")");
}

//same as rtmCall but asynchronously and calls callback when it's done
function rtmCallAsync (data, callback) {
	if(typeof(data) != "object") return "Need a data object";
	if(typeof(data.method) == "undefined") return "Need a method name";

	data.api_key = api_key;
	data.format = "json";
	if (typeof(token) != "undefined") data.auth_token = token;
	if (typeof(timeline) != "undefined") data.timeline = timeline;
	rtmSign(data);

	$.ajax ({
		async: true,
		url: methurl,
		data: data,
		success: callback
	});
}

//sign rtm requests
function rtmSign (args) {
	var arr = [];
	var str = shared_secret;

	for (var e in args) arr.push(e);
	arr.sort();

	for (var i=0;i<arr.length;i++) str+=arr[i]+args[arr[i]];
	var sig = String(MD5(str));
	//log("signstr: "+str);
	//log("signsig: "+sig);
	args.api_sig = sig;
}

//get frob (required for auth)
function rtmGetFrob () {
	if(checkHaveFrob()) {
		log("using existing frob: " + String(widget.preferenceForKey("frob")));
		return widget.preferenceForKey("frob");
	}
	
	//ask for a new frob
	var res = rtmCall({method:"rtm.auth.getFrob"});
	//log("frob: "+res.rsp.frob);
	if(res.rsp.stat == "ok"){
		if(window.widget) widget.setPreferenceForKey(res.rsp.frob, "frob");
		return res.rsp.frob;
	}
	return "fail"; //fail to get frob
}

//check if we already have a frob
function checkHaveFrob () {
	if (!window.widget) return false;
	return (widget.preferenceForKey("frob") != "undefined" && typeof(widget.preferenceForKey("frob")) != "undefined");
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

/**
 * add task to rtm
 *
 * parse:"1" enables Smart Add
 * @see http://www.rememberthemilk.com/services/smartadd/
 */
function rtmAdd (name, list_id) {
	// use defaultlist if list_id is undefined
	list_id = (list_id === undefined)?defaultlist:list_id;
	log("rtmAdd: "+name+" to "+list_id);
	
	if (list_id != "")
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1",list_id:list_id},rtmCallback);
	else
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1"},rtmCallback);
}

//complete tasks[t]
function rtmComplete (t){
	rtmCallAsync({method:"rtm.tasks.complete",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id},rtmCallback);
}

//delete tasks[t]
function rtmDelete (t){
	rtmCallAsync({method:"rtm.tasks.delete",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id},rtmCallback);
}

//rename tasks[t]
function rtmName (t,name){
	rtmCallAsync({method:"rtm.tasks.setName",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id,name:name},rtmCallback);
}

//postpone tasks[t]
function rtmPostpone (t){
	rtmCallAsync({method:"rtm.tasks.postpone",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id},rtmCallback);
}

//set priority of tasks[t]
function rtmPriority (t,priority) {
	// update priority color before sending request to server
	$("li#"+tasks[t].task.id).removeClass();
	$("li#"+tasks[t].task.id).addClass("priority-"+priority);
	rtmCallAsync({method:"rtm.tasks.setPriority",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id,priority:priority},rtmCallback);
}

//parse text to time
function rtmParse (text){
	var res = rtmCall({method:"rtm.time.parse",text:text}).rsp;
	var t = res.time.$t;
	var d = new Date();
	d.setISO8601(t);
	return d;
}

//same as rtmParse but uses callback
function rtmParseAsync (text,callback){
	rtmCallAsync({method:"rtm.time.parse",text:text},function(r,t){
		var res = eval("("+r+")").rsp;
		var d = new Date();
		d.setISO8601(res.time.$t);
		callback(d);
	});
}

//set due date for tasks[t]
function rtmDate (t,date){
	var d = rtmParse(date);
	var data = {method:"rtm.tasks.setDueDate",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id};
	if (d.getTime()!=0) data.parse = "1";
	rtmCallAsync(data,rtmCallback);
}

//same as rtmDate, but also call showDetails(lookUp(id))
function rtmDateID (t,date,id) {
	rtmParseAsync(date,function(d){
		var data = {method:"rtm.tasks.setDueDate",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id};
		if (d.getTime()!=0){
			data.parse = "1";
			data.due = date;
		}
		rtmCallAsync(data,rtmCallback);
	});
}

//move a task to a different list
function rtmList (t,to_list_id) {
	rtmCallAsync({method:"rtm.tasks.moveTo",from_list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id,to_list_id:to_list_id},function(r,tt){
		log(r);
		var res = eval("("+r+")").rsp;
		if (res.stat!="ok") return;
		if (res.transaction.undoable==1) undoStack.push(res.transaction.id);
		tasks[t].list_id = to_list_id;
		for (l in lists)
			if (lists[l].id == tasks[t].list_id)
				tasks[t].list_name = lists[l].name;
	});
}

// set tags for a task
function rtmSetTags (t, tags) {
	var data = {method:"rtm.tasks.setTags",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id};
	if (tags != "") data.tags = tags;
	rtmCallAsync(data,rtmCallback);
}

// set url for a task
function rtmSetURL (t, url) {
	var data = {method:"rtm.tasks.setURL",list_id:tasks[t].list_id,taskseries_id:tasks[t].id,task_id:tasks[t].task.id};
	if (url != "") data.url = url;
	rtmCallAsync(data,rtmCallback);
}

//undo last action
function rtmUndo(){
	if (undoStack.length < 1) return;
	rtmCallAsync({method:"rtm.transactions.undo",transaction_id:undoStack.pop()},function(r,t){refresh();});
}

//most common callback
function rtmCallback (r,t){
	log(r);
	var res = eval("("+r+")").rsp;
	if (res.stat=="ok"&&res.transaction.undoable==1) undoStack.push(res.transaction.id);
	refresh();
}

// deauthorize the widget, resets token and frob
function deAuthorize (){
	if (window.widget){
		widget.setPreferenceForKey(null,"token");
		widget.setPreferenceForKey(null,"frob");
	}
	showFront();
}

//get token, then create timeline
function getAuthToken (){
	var auth = rtmCall({method:"rtm.auth.getToken",frob:rtmGetFrob()}).rsp;
	if (auth.stat=="fail"&&auth.err.code=="101"){
		//Invalid frob - did you authenticate?
		widget.setPreferenceForKey(null, "frob");
	}
	if (auth.stat!="ok") return false;
	auth = auth.auth;
	token = auth.token;
	user_id = auth.user.id;
	user_username = auth.user.username;
	user_fullname = auth.user.fullname;
	if (window.widget){
		widget.setPreferenceForKey(token, "token");
		widget.setPreferenceForKey(user_id, "user_id");
		widget.setPreferenceForKey(user_username, "user_username");
		widget.setPreferenceForKey(user_fullname, "user_fullname");
	}
	log("token: "+token);
	log("user_id: "+user_id);
	log("user_username: "+user_username);
	log("user_fullname: "+user_fullname);
	return createTimeline();
}

//check if the current token is valid
function checkToken (){
	if (window.widget){
		if (typeof(widget.preferenceForKey("token"))=="undefined") return getAuthToken();
		token = widget.preferenceForKey("token");
		user_id = widget.preferenceForKey("user_id");
		user_username = widget.preferenceForKey("user_username");
		user_fullname = widget.preferenceForKey("user_fullname");
		timeline = widget.preferenceForKey("timeline");
	}
	var auth = rtmCall({method:"rtm.auth.checkToken"}).rsp;
	if (auth.stat=="ok") return true;
	return getAuthToken();
}

//create timeline (required to undo action)
function createTimeline (){
	var res = rtmCall({method:"rtm.timelines.create"}).rsp;
	if (res.stat!="ok") return false;
	timeline = res.timeline;
	if (window.widget) widget.setPreferenceForKey(timeline, "timeline");
	log("timeline: "+timeline);
	return true;
}

//get list of lists, then call callback
function getLists (callback){
	$("#magiclist").empty();
	$("#magiclist").append("<option value=''>All</option>");
	$("#magiclist").append("<option disabled>---</option>");
	rtmCallAsync({method:"rtm.lists.getList"},function(r,t){
		log(r);
		var res = eval("("+r+")").rsp;
		if (res.stat=="ok") {
			lists = res.lists.list;
			$("#taskinput_list").empty();
			$("#detailslist_select").empty();
			for (var l in lists){
				if (("list:\""+lists[l].name+"\"")==selectedList) $("#magiclist").append("<option selected value='list:\""+lists[l].name+"\"'>"+lists[l].name+"</option>");
				else $("#magiclist").append("<option value='list:\""+lists[l].name+"\"'>"+lists[l].name+"</option>");
				$("#detailslist_select").append("<option value='"+lists[l].id+"'>"+lists[l].name+"</option>");
				if (lists[l].smart=="1") continue;
				$("#taskinput_list").append("<option value='"+lists[l].id+"'>"+lists[l].name+"</option>");
			}
			$("#taskinput_list").val(defaultlist);
		}
		callback();
	});
}

//get user setting
function getSettings (){
	if (window.widget){
		if (typeof(widget.preferenceForKey("timezone")) != "undefined" &&
			typeof(widget.preferenceForKey("dateformat")) != "undefined" &&
			typeof(widget.preferenceForKey("timeformat")) != "undefined" &&
			typeof(widget.preferenceForKey("defaultlist")) != "undefined" &&
			typeof(widget.preferenceForKey("language")) != "undefined") {
			//already have user setting
			timezone = widget.preferenceForKey("timezone");
			dateformat = widget.preferenceForKey("dateformat");
			timeformat = widget.preferenceForKey("timeformat");
			defaultlist = widget.preferenceForKey("defaultlist");
			language = widget.preferenceForKey("language");
			hasSettings = true;
			return true;
		}
	}
	var res = rtmCall({method:"rtm.settings.getList"}).rsp;
	if (res.stat!="ok") return false;
	timezone = res.settings.timezone;
	dateformat = res.settings.dateformat;
	timeformat = res.settings.timeformat;
	defaultlist = res.settings.defaultlist;
	language = res.settings.language;
	log("timezone: "+timezone);
	log("dateformat: "+dateformat);
	log("timeformat: "+timeformat);
	log("defaultlist: "+defaultlist);
	log("language: "+language);
	if (window.widget){
		widget.setPreferenceForKey(timezone, "timezone");
		widget.setPreferenceForKey(dateformat, "dateformat");
		widget.setPreferenceForKey(timeformat, "timeformat");
		widget.setPreferenceForKey(defaultlist, "defaultlist");
		widget.setPreferenceForKey(language, "language");
	}
	hasSettings = true;
	return true;
}

//called when magic filter is changed
function filterChange (){
	var s = "";
	var first = true;
	var values = ['magiclist','magicpriority','magicstatus'];
	for (var v in values){
		if (document.getElementById(values[v]).value!=""){
			if (first) first = false;
			else s += " AND ";
			s += document.getElementById(values[v]).value;
		}
	}
	if (document.getElementById('magictext').value!=""){
		if (first) first = false;
		else s += " AND ";
		s += "name:\""+document.getElementById('magictext').value+"\"";
	}
	if (document.getElementById('magictags').value!=""){
		if (first) first = false;
		else s += " AND ";
		s += "tag:"+document.getElementById('magictags').value;
	}
	document.getElementById('customtext').value = s;
	selectedList = document.getElementById('magiclist').value;
	
	if (window.widget) {
		widget.setPreferenceForKey($("#magiclist").val(), "magiclist");
		widget.setPreferenceForKey($("#magicpriority").val(), "magicpriority");
		widget.setPreferenceForKey($("#magicstatus").val(), "magicstatus");
		widget.setPreferenceForKey($("#magictext").val(), "magictext");
		widget.setPreferenceForKey($("#magictags").val(), "magictags");
	}
}

//Event listeners for resizing the widget
function resizeMousedown (event) {
    document.addEventListener("mousemove", resizeMousemove, true);
    document.addEventListener("mouseup", resizeMouseup, true);
	
	resizeOffset = {x:(window.innerWidth - detailsWidth - event.pageX), y:(window.innerHeight - event.pageY)};
	
	event.stopPropagation();
	event.preventDefault();
}
function resizeMousemove (event) {
	taskHeight = Math.max(event.pageY + resizeOffset.y, minHeight);
	taskWidth = Math.max(event.pageX + resizeOffset.x, minWidth);
	
	window.resizeTo(taskWidth + detailsWidth, taskHeight);
	
	updateWindow();
	
	event.stopPropagation();
	event.preventDefault();
}
function resizeMouseup (event) {
	document.removeEventListener("mousemove", resizeMousemove, true);
	document.removeEventListener("mouseup", resizeMouseup, true);
	
	event.stopPropagation();
	event.preventDefault();
	
	if (window.widget) {
		widget.setPreferenceForKey(taskWidth, "taskWidth");
		widget.setPreferenceForKey(taskHeight, "taskHeight");
	}
}

//update css values the depend on the size of the widget
function updateWindow () {
	// TODO: do as much of these in css as possible
	$("#front").css("width", taskWidth - 30);
	$("#front").css("height", taskHeight - 20);
	$("#resize").css("left", taskWidth - 27);
	$("#info").css("right", detailsWidth + 18);
	$("#loading").css("left", taskWidth - 34);
	$("#taskDetails").css("left", taskWidth - 11);
	$("#taskDetails").css("top", taskHeight / 2 - 100);
	$("#inputDiv").css("width", taskWidth * 0.92);
	$("#listDiv").css("width", taskWidth - 40);
	$("#listScrollbar").css("left", taskWidth - 36);
	$("#taskList li .taskname").css("width", taskWidth - 78);
	gMyScrollArea.refresh();
	if (!gMyScrollbar.hidden && taskHeight - minHeight < gMyScrollbar.size) {
		gMyScrollbar.hide();
	}
}

// ===== START OF Details =====

//show details of tasks[t]
function showDetails (t){
	if (detailsOpen && currentTask == t){
		closeDetails();
		return;
	}
	
	// task box is currently animating, leave it alone
	if ($("#taskDetails:animated").length > 0) return;
	
	if (!detailsOpen){
		detailsOpen = true;
		detailsWidth = 200;
		$("#taskDetails").css("left", taskWidth - 11);
		if (window.widget) window.resizeTo(taskWidth + detailsWidth, taskHeight);
		updateWindow();
		$("#taskDetails").css("border-style","solid");
		updateDetails(t);
		$("#taskDetails:not(:animated)").animate({width: detailsWidth+"px"},{duration:500,complete:function(){}});
		return;
	}
	updateDetails(t);
}

// update detail box without closing it
function updateDetails (t){
	editing=false;
	$("#detailsName").html(tasks[t].name);
	$("#detailsName_edit").val($("#detailsName").html());
	sdate="";
	if (tasks[t].date.getTime()==2147483647000)
		sdate="never"; //no due date
	else
		sdate=tasks[t].date.format("d mmm yy");
	if (tasks[t].task.has_due_time==1) {
		if (timeformat == 0) {
			sdate += " at "+ tasks[t].date.format("h:MM TT");
		}else{
			sdate += " at "+ tasks[t].date.format("H:MM");
		}
	}
	$("#detailsdue_span").html(sdate);
	$("#detailsdue_editfield").val($("#detailsdue_span").html());
	
	$("#detailslist_span").html(tasks[t].list_name);
	$("#detailslist_select").val(tasks[t].list_id);
	
	var tags = "";
	if (tasks[t].tags.length != 0) { // non-empty tags
		if (typeof(tasks[t].tags.tag) == "string") { // only one tag
			tags = tasks[t].tags.tag;
		}else{ // more than one tags
			tags = tasks[t].tags.tag.join(", ");
		}
	}
	$("#detailstags_span").html(tags);
	$("#detailstags_editfield").val($("#detailstags_span").html());
	
	$("#detailsurl_span").unbind('click');
	$("#detailsurl_span").click(function(){widget.openURL(tasks[t].url);});
	$("#detailsurl_span").html(tasks[t].url);
	$("#detailsurl_editfield").val($("#detailsurl_span").html());
	
	$("#more_details").unbind('click');
	$("#more_details").click(function(){widget.openURL('http://www.rememberthemilk.com/home/'+user_username+'/'+tasks[t].list_id+'/'+tasks[t].task.id);});
	$("#detailsDiv").css("display","block");
	currentTask = t;
}

//close detail box
function closeDetails (){
	$("#detailsDiv").css("display","none");
	if (detailsOpen){
		detailsOpen = false;
		currentTask = null;
		detailsWidth = 0;
		$("#taskDetails").animate({width: detailsWidth+"px"},{duration:500,complete:function(){
			updateWindow();
			if (window.widget) window.resizeTo(taskWidth + detailsWidth, taskHeight);
			$("#taskDetails").css("border-style","none");
		}});
	}
}

//edit the name field in details
function editName (){
	if (editing) return;
	editing=true;
	$("#detailsName").css("display","none");
	$("#detailsName_edit").css("display","block");
	$("#detailsName_edit").val($(detailsName).html());
	$("#detailsName_edit").select();
}

//finish editing name
function nameEdit (){
	editing=false;
	$("#detailsName").css("display","block");
	$("#detailsName_edit").css("display","none");
	var old = $("#detailsName").html();
	var cur = $("#detailsName_edit").val();
	$("#detailsName").html($("#detailsName_edit").val());
	if (old!=cur) rtmName(currentTask,cur);
}

//edit the date field in details
function editDate (){
	if (editing) return;
	editing=true;
	$("#detailsdue_span").css("display","none");
	$("#detailsdue_editfield").css("display","inline");
	$("#detailsdue_editfield").val($("#detailsdue_span").html());
	$("#detailsdue_editfield").select();
}

//finish editing date
function dateEdit (){
	editing=false;
	$("#detailsdue_span").css("display","inline");
	$("#detailsdue_editfield").css("display","none");
	var old = $("#detailsdue_span").html();
	var cur = $("#detailsdue_editfield").val();
	var id = tasks[currentTask].task.id;
	if (old!=cur) rtmDateID(currentTask,cur,id);
	else {
		var sdate="";
		if (tasks[currentTask].date.getTime()==2147483647000)
			sdate="never"; //no due date
		else
			sdate=tasks[currentTask].date.format("d mmm yy");
		if (tasks[currentTask].task.has_due_time==1) {
			if (timeformat == 0) {
				sdate += " at "+ tasks[currentTask].date.format("h:MM TT");
			}else{
				sdate += " at "+ tasks[currentTask].date.format("H:MM");
			}
		}
		$("#detailsdue_span").html(sdate);
	}
}

//edit the list field in details
function editList() {
	if (editing) return;
	editing=true;
	$("#detailslist_span").css("display","none");
	$("#detailslist_select").css("display","inline");
	$("#detailslist_select").val(tasks[currentTask].list_id);
	$("#detailslist_select").focus();
}

//finish editing list
function listEdit (){
	editing=false;
	$("#detailslist_span").css("display","inline");
	$("#detailslist_select").css("display","none");
	if (tasks[currentTask].list_id==$("#detailslist_select").val()) return;
	rtmList(currentTask,$("#detailslist_select").val());
	for (l in lists)
		if (lists[l].id==$("#detailslist_select").val())
			$("#detailslist_span").html(lists[l].name);
}

//edit the tags field in details
function editTags (){
	if (editing) return;
	editing=true;
	$("#detailstags_span").css("display","none");
	$("#detailstags_editfield").css("display","inline");
	$("#detailstags_editfield").val($("#detailstags_span").html());
	$("#detailstags_editfield").select();
}

//finish editing tags
function tagsEdit (){
	editing=false;
	$("#detailstags_span").css("display","inline");
	$("#detailstags_editfield").css("display","none");
	var old = $("#detailstags_span").html();
	var cur = $("#detailstags_editfield").val();
	$("#detailstags_span").html($("#detailstags_editfield").val());
	if (old != cur) rtmSetTags(currentTask,cur);
}

//edit the url field in details
function editURL (){
	if (editing) return;
	editing=true;
	$("#detailsurl_span").css("display","none");
	$("#detailsurl_editfield").css("display","inline");
	$("#detailsurl_editfield").val($("#detailsurl_span").html());
	$("#detailsurl_editfield").select();
}

//finish editing url
function urlEdit (){
	editing=false;
	$("#detailsurl_span").css("display","inline");
	$("#detailsurl_editfield").css("display","none");
	var old = $("#detailsurl_span").html();
	var cur = $("#detailsurl_editfield").val();
	$("#detailsurl_span").html(cur);
	if (old != cur) rtmSetURL(currentTask,cur);
}

// ===== END OF Details =====

//find the task with id
function lookUp (id){
	for (var t in tasks) if (tasks[t].task.id==id) return t;
}

//gets the task list, displays them
function refresh (){
	if (!checkToken()){
		//show auth link
		$("#authDiv").show();
		$("#listDiv").hide();
		if (window.widget) $("#authDiv").html("<span id=\"authurl\" class=\"url\" onclick=\"widget.openURL('"+rtmAuthURL("delete")+"')\">Click Here</span> to authenticate.");
		else $("#authDiv").html("<a id=\"authurl\" target=\"_blank\" href=\""+rtmAuthURL("delete")+"\">Click Here</a> to authenticate.");

		updateWindow();
	}else{
		if (!hasSettings) getSettings();
		//get task list
		$("#authDiv").hide();
		$("#listDiv").show();
		// Do not have any list yet, get list then display tasks
		if (lists.length == 0) {
			getLists(function () {
				// Filter settings
				magiclist = widget.preferenceForKey("magiclist");
				magicpriority = widget.preferenceForKey("magicpriority");
				magicstatus = widget.preferenceForKey("magicstatus");
				magictext = widget.preferenceForKey("magictext");
				magictags = widget.preferenceForKey("magictags");
				if (!magiclist) magiclist = "";
				if (!magicpriority) magicpriority = "";
				if (!magicstatus) magicstatus = "status:incomplete";
				if (!magictext) magictext = "";
				if (!magictags) magictags = "";
				$("#magiclist").val(magiclist);
				$("#magicpriority").val(magicpriority);
				$("#magicstatus").val(magicstatus);
				$("#magictext").val(magictext);
				$("#magictags").val(magictags);
				filterChange();
				
				displayTasks();
			});
		}
		else displayTasks();
	}
}

function displayTasks() {
	rtmCallAsync({method:"rtm.tasks.getList",filter:document.getElementById('customtext').value},function (r,t){
		if (detailsOpen) var id = tasks[currentTask].task.id; //currentTask might change
		tasks = [];
		temptasks = eval("("+r+")").rsp.tasks;
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
		tasks.sort(sortTasks);
		$("#taskList").empty();
		for (var t in tasks){
			log(tasks[t].name + " " + tasks[t].date);
			var date = tasks[t].date.toString().split(" ");
			var sdate = date[1]+" "+date[2];
			var d = new Date();
			var today = new Date(d.getFullYear(),d.getMonth(),d.getDate());
			var tmr = new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
			var week = new Date(d.getFullYear(),d.getMonth(),d.getDate()+7);
			var name = tasks[t].name;
			if (tasks[t].date >= today && tasks[t].date < tmr){
				sdate = "Today"; //Today
				name = "<b>"+name+"</b>";
			}
			if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==1)
				sdate = tasks[t].date.format("ddd"); //Within a week, short day
			if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==0)
				sdate = tasks[t].date.format("dddd"); //Within a week, long day
			if (tasks[t].task.has_due_time==1){
				if (timeformat == 0) {
					sdate += " @ "+ tasks[t].date.format("h:MM TT");
				}else{
					sdate += " @ "+ tasks[t].date.format("H:MM");
				}
			}
			if (tasks[t].date<today)
				name = "<u><b>"+name+"</b></u>"; //overdue
			if (tasks[t].date.getTime()==2147483647000)
				sdate = ""; //no due date
				
			// priority
			var prio = tasks[t].task.priority;
			
			// growl
			if (growl) {
                var growlSend = false;

    			// Set a new growl notification timeout
    			if (!growlTimeouts[tasks[t].id]) {
    			    growlTimeouts[tasks[t].id] = new Object();
    			    growlSend = true;
    			}
			
    		    // Due date has been changed, clear old timeout and set a new one
    			if (growlTimeouts[tasks[t].id] && (growlTimeouts[tasks[t].id].date - tasks[t].date) != 0) {
    			    window.clearTimeout(growlTimeouts[tasks[t].id].timeout);
    			    growlSend = true;
    			}
    			
    			if (growlSend) {
			        var msg = "";
                    var diff = tasks[t].date - d - growlBefore * 60000;
    			    if (tasks[t].date < d) {
    			        msg = "Overdue";
    			    }else if (diff < 0) {
    			        msg = "Due in " + Math.floor((tasks[t].date - d) / 60000) + " min";
    			    }else{
    			        msg = "Due in " + growlBefore + " min";
    			    }
        			growlTimeouts[tasks[t].id].date = tasks[t].date;
    			    growlTimeouts[tasks[t].id].name = tasks[t].name;
    			    growlTimeouts[tasks[t].id].timeout = window.setTimeout(growl_notify, diff, tasks[t].name, msg, tasks[t].id);
    			}
			}
			
			// add to list view
			$("#taskList").append("<li id='"+tasks[t].task.id+"' class='priority-"+prio+"'><input type='checkbox' onclick='rtmComplete("+t+")'/><span class=\"taskname\" onclick=\"showDetails("+t+")\">"+name+"<span class=\"duedate\">"+sdate+"</span></span></li>");
		}

		if (undoStack.length > 0) $("#undo").show();
		else $("#undo").hide();

		updateWindow();
		
		if (detailsOpen) updateDetails(lookUp(id)); //show the new task detail
	});
}

//add a task to tasks array, also include list_id and date
function addTask (t,list_id) {
	if (t.task.length === undefined){
		var d = new Date();
		if (t.task.due===undefined || t.task.due=="") d.setTime(2147483647000); //no due date
		else d.setISO8601(t.task.due);
		t.date = d;
		t.list_id = list_id;
		for (l in lists)
			if (lists[l].id==t.list_id)
				t.list_name=lists[l].name;

		tasks.push(t);
	}else{
		// repeated task
		for (var s in t.task){
			var tt = $.extend({}, t); // clones the object
			tt.task = tt.task[s];
			
			var d = new Date();
			if (tt.task.due===undefined || tt.task.due=="") d.setTime(2147483647000); //no due date
			else d.setISO8601(tt.task.due);
			tt.date = d;
			tt.list_id = list_id;
			for (l in lists)
				if (lists[l].id==tt.list_id)
					tt.list_name=lists[l].name;
			
			tasks.push(tt);
		}
	}
}

// compares prioritiies
function comparePriority(a, b){
	a = (a == "N") ? 4: a;
	b = (b == "N") ? 4: b;
	return a - b;
}

// compares strings
function compareString(a, b){
	if (a == b) return 0;
	return (a < b) ? -1 : 1;
}

//helper function to sort task
//first by date, then priority, finally name
function sortTasks (t1, t2){
	return t1.date-t2.date || 
				 comparePriority(t1.task.priority, t2.task.priority) || 
				 compareString(t1.name, t2.name);
}

//done with filter, return to front
function filterKeyPress (event){
	enterKeyPress(event,function(){
		filterChange();
		showFront();
	});
}

// call callback if either enter or return is pressed
function enterKeyPress (event,callback) {
	switch (event.keyCode) {
		case 13: // return
		case 3:  // enter
			callback();
			break;
	}
}

// Function for interacting with growl through applescript

// Check if growl is installed
function check_growl_installed() {
 	if(window.widget) {
		var output = widget.system("/usr/bin/osascript -e " +  
			"'tell application \"System Events\" to return count of (every process whose name is \"GrowlHelperApp\")'",
			null).outputString;
		if (output > 0) {
			return true;
		}else{
			return false;
		}
	} else {
		return false;
	}
}

// Register our notifications as "Task Reminder"
// Must be called before growl_notify() is used.
function register_with_growl() {
	widget.system("/usr/bin/osascript " +
		"-e 'set allN to { \"Task Reminder\" }' " +
		"-e 'tell application \"GrowlHelperApp\"' " +
		"-e 'register as application \"Milk the Cow\" " +
		"all notifications allN " +
		"default notifications allN " +
		"icon of application \"Dashboard\"' " +
		"-e 'end tell'",
		null);
}

// Send growl notification with title and description
// Then remove entry from growlTimeouts
function growl_notify(title, desc, taskid) {
	var img = (document.location.href+'').replace(/\/[^\/]*$/, "");
	img = img.replace(/^file:\//, "file:///") + "/Icon.png";

	widget.system("/usr/bin/osascript " +
		"-e 'tell application \"GrowlHelperApp\"' " +
		"-e 'notify with name \"Task Reminder\" title \"" + title + "\" description \"" + desc + "\" application name \"Milk the Cow\" " +
		"image from location \"" + img + "\"' " +
		"-e 'end tell'",function(obj){});
		
    growlTimeouts[taskid].timeout = null;
}

// debug
function log (s){
	if (typeof(debug)!="undefined" && debug) alert(s);
}

// execute this when the widget is loaded
$(document).ready(function () {
	if (window.widget) {
		widget.onremove = remove;
		widget.onhide = hide;
		widget.onshow = show;
		widget.onsync = sync;
	}
	
	$.ajaxSetup({
		async:false,
		type:"GET",
		beforeSend: function (req) { req.setRequestHeader("Cache-Control", "no-cache"); $("#loading").show(); },
		complete: function (req, status) { $("#loading").fadeOut("slow"); }
	});
	
	//setup Apple buttons
	new AppleGlassButton(document.getElementById("done"), "Done", showFront);
	new AppleInfoButton(document.getElementById("info"), document.getElementById("front"), "black", "black", showBack);
	
	//setup Apple Scrollbar
	gMyScrollbar = new AppleVerticalScrollbar(document.getElementById("listScrollbar"));
	gMyScrollArea = new AppleScrollArea(document.getElementById("listDiv"),gMyScrollbar);

	$("#me").text("Milk the Cow "+version+" by Rich Hong");

	// Load widget dimension settings
	if (window.widget) {
		taskWidth = widget.preferenceForKey("taskWidth");
		taskHeight = widget.preferenceForKey("taskHeight");
		if (!taskWidth) taskWidth = defaultWidth;
		if (!taskHeight) taskHeight = defaultHeight;
		window.resizeTo(taskWidth + detailsWidth, taskHeight);
		updateWindow();
	}

	// ==========================================================================
	// setup up event listeners
	$("#deauth").click(function(){deAuthorize();});
	$("#website").click(function(){widget.openURL('http://code.google.com/p/milkthecow/');});
	// keypress event helper for the entire widget
	$("body").keypress(function (event) {
	    // Ignore keypresses if control, option or meta keys are pressed
	    if (event.ctrlKey || event.altKey || event.metaKey) return;
	    
		// z: undo even if details is not open
		if (event.keyCode == 122 && !editing) {
			rtmUndo();
			return;
		}
		if (!detailsOpen) return;
		switch (event.keyCode) {
			case 27: // <esc>
				if (editing) {
					$("#detailsName_edit").val($("#detailsName").html());
					nameEdit();

					$("#detailsdue_editfield").val($("#detailsdue_span").html());
					dateEdit();
					
					$("#detailslist_select").val(tasks[currentTask].list_id);
					listEdit();
					
					$("#detailstags_editfield").val($("#detailstags_span").html());
					tagsEdit();
					
					$("#detailsurl_editfield").val($("#detailsurl_span").html());
					urlEdit();
				}else{
					closeDetails();
				}
				break;
			// priority
			case 49: // 1
			case 50: // 2
			case 51: // 3
			case 52: // 4
				if (!editing) {
					rtmPriority(currentTask,event.keyCode-48);
				}
				break;
			case 99: // c: complete
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					rtmComplete(currentTask);
					closeDetails();
				}
				break;
			case 100: // d: due date
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					editDate();
				}
				break;
			case 112: // p: postpone
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					rtmPostpone(currentTask);
				}
				break;
			case 114: // r: rename
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					editName();
				}
				break;
			case 115: // s: tags
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					editTags();
				}
				break;
			case 117: // u: url
				if (!editing) {
					event.stopPropagation();
					event.preventDefault();
					editURL();
				}
				break;
		}
	});
	// add a task when return or enter is pressed
	$("#taskinput,#taskinput_list").keypress(function (event) {
		enterKeyPress(event,function(){
			rtmAdd(document.getElementById('taskinput').value,$("#taskinput_list").val());
			document.getElementById('taskinput').value = '';
		});
	});
	$("#growl").change(function () {
	    growl = $("#growl").attr("checked");
	    if (growl && check_growl_installed()) {
    		register_with_growl();
    	}else{
    	    growl = false;
    	}
	    if (window.widget) widget.setPreferenceForKey(growl, "growl");
	    
	    // If disabling growl, clear all current timeouts
	    if (!growl) {
	        for (var t in growlTimeouts) {
	            window.clearTimeout(growlTimeouts[t].timeout);
	            growlTimeouts[t] = null;
	        }
	    }
	});
	$("#growlBefore").change(function () {
	    growlBefore = parseInt($("#growlBefore").val());
	    if (window.widget) widget.setPreferenceForKey(growlBefore, "growlBefore");
	    $("#growlBefore").val(growlBefore);
	    
	    if (growl) {
	        // Update all timeouts
	        for (var t in growlTimeouts) {
	            if (!growlTimeouts[t].timeout) continue;
	            window.clearTimeout(growlTimeouts[t].timeout);
	            var d = new Date();
			    var msg = "";
                var diff = growlTimeouts[t].date - d - growlBefore * 60000;
    			if (growlTimeouts[t].date < d) {
			        msg = "Overdue";
			    }else if (diff < 0) {
			        msg = "Due in " + Math.floor((growlTimeouts[t].date - d) / 60000) + " min";
			    }else{
			        msg = "Due in " + growlBefore + " min";
			    }
			    growlTimeouts[t].timeout = window.setTimeout(growl_notify, diff, growlTimeouts[t].name, msg, t);
	        }
	    }
	});
	// ==========================================================================
	
	// Growl
	if (window.widget) {
    	if (typeof(widget.preferenceForKey("growl")) != "undefined") {
    	    growl = widget.preferenceForKey("growl");
    	}
    	if (typeof(widget.preferenceForKey("growlBefore")) != "undefined") {
    	    growlBefore = widget.preferenceForKey("growlBefore");
    	    $("#growlBefore").val(growlBefore);
    	}
	}
	if (growl && check_growl_installed()) {
		register_with_growl();
	}else{
	    growl = false;
	    if (window.widget) widget.setPreferenceForKey(growl, "growl");
	}
	if (growl) {
	    $("#growl").attr("checked", true);
	}

	refresh();
});
