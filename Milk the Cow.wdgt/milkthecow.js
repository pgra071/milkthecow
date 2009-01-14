// Milk the Cow
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/
//
//This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

var version = "0.4.2";
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

var tasks = [];
var undoStack = []; //stack of transaction id
var lists = []; //user lists for tasks
var detailsOpen = false;
var selectedList = ""; //selected list
var currentTask = null; //the task with details box showing
var editing = false; //currently editing a field

var hasSettings = false;
//user setting - http://www.rememberthemilk.com/services/api/methods/rtm.settings.getList.rtm
var timezone = "";    //The user's Olson timezone. Blank if the user has not set a timezone.
var dateformat = 1;   //0 indicates an European date format (e.g. 14/02/06), 1 indicates an American date format (e.g. 02/14/06).
var timeformat = 0;   //0 indicates 12 hour time with day period (e.g. 5pm), 1 indicates 24 hour time (e.g. 17:00).
var defaultlist = ""; //The user's default list. Blank if the user has not set a default list.
var language = "";    //The user's language (ISO 639-1 code).

var gMyScrollArea, gMyScrollbar;

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
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
}

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
	widget.setPreferenceForKey(null, "timezone");
	widget.setPreferenceForKey(null, "dateformat");
	widget.setPreferenceForKey(null, "timeformat");
	widget.setPreferenceForKey(null, "defaultlist");
	widget.setPreferenceForKey(null, "language");
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
	timezone = widget.preferenceForKey("timezone");
	dateformat = widget.preferenceForKey("dateformat");
	timeformat = widget.preferenceForKey("timeformat");
	defaultlist = widget.preferenceForKey("defaultlist");
	language = widget.preferenceForKey("language");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event)
{
	if (window.widget) widget.prepareForTransition("ToBack");
	document.getElementById("front").style.display = "none";
	document.getElementById("back").style.display = "block";
	if (window.widget) setTimeout('widget.performTransition();', 0);
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event)
{
	if (window.widget) widget.prepareForTransition("ToFront");
	document.getElementById("front").style.display="block";
	document.getElementById("back").style.display="none";
	if (window.widget) setTimeout('widget.performTransition();', 0);
	refresh();
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

//add task to rtm
function rtmAdd (name, list_id){
	var i;
	var tags = [];
	//searching for tags in task name
	//of the form: taskname [/tag1 /tag2 ...]
	//however, taskname should at least be of 1 character
	while ((i = name.search(/\/\S+\s*$/))>0){
		tags.push(name.substr(i).replace(/^\/|\s+$/,""));
		name = name.substr(0,i);
	}
	tags = tags.join(",");
	
	list_id = (list_id === undefined)?defaultlist:list_id;
	log("rtmAdd: "+name+" to "+list_id);
	
	//callback function for rtmAdd, add tags if tags exist 
	var callback = function rtmAddCallback (r,t) {
		var res = eval("("+r+")").rsp;
		if (res.stat=="ok"&&res.transaction.undoable==1) undoStack.push(res.transaction.id);
		if (tags.length<=0){
			refresh();
		}else{
			//Add tags to a task. tags should be a comma delimited list of tags.
			//This method requires authentication with write permissions.
			//This method requires a timeline.
			//The effects of this method can be undone.
			log("addTags: "+tags);
			rtmCallAsync({method:"rtm.tasks.addTags",list_id:res.list.id,taskseries_id:res.list.taskseries.id,task_id:res.list.taskseries.task.id,tags:tags},rtmCallback);
		}
	}
	
	if (list_id != "")
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1",list_id:list_id},callback);
	else
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1"},callback);
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
	$("#detailslist_select").empty();
	rtmCallAsync({method:"rtm.lists.getList"},function(r,t){
		log(r);
		var res = eval("("+r+")").rsp;
		if (res.stat=="ok") {
			lists = res.lists.list;
			$("#taskinput_list").empty();
			for (var l in lists){
				if (("list:\""+lists[l].name+"\"")==selectedList) $("#magiclist").append("<option selected value='list:\""+lists[l].name+"\"'>"+lists[l].name+"</option>");
				else $("#magiclist").append("<option value='list:\""+lists[l].name+"\"'>"+lists[l].name+"</option>");
				$("#detailslist_select").append("<option value='"+lists[l].id+"'>"+lists[l].name+"</option>");
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
		if (typeof(widget.preferenceForKey("timezone"))!="undefined"&&
				typeof(widget.preferenceForKey("dateformat"))!="undefined"&&
				typeof(widget.preferenceForKey("timeformat"))!="undefined"&&
				typeof(widget.preferenceForKey("defaultlist"))!="undefined"&&
				typeof(widget.preferenceForKey("language"))!="undefined"){
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
}

//show details of tasks[t]
function showDetails (t){
	currentTask = t;
	if (!detailsOpen){
		detailsOpen = true;
		if (window.widget) window.resizeTo(480,380);
		$("#taskDetails").css("border-style","solid");
		$("#taskDetails").animate({width: "200px"},1000,showDetails(t));
		return;
	}
	editing=false;
	$("#detailsName").html(tasks[t].name);
	sdate="";
	if (tasks[t].date.getTime()==2147483647000)
		sdate="never"; //no due date
	else
		sdate=tasks[t].date.format("d mmm yy");
	if (tasks[t].task.has_due_time==1)
		sdate += " at "+ tasks[t].date.format("h:MM TT");
	$("#detailsdue_span").html(sdate);
	$("#detailslist_span").html(tasks[t].list_name);
	$("#more_details").unbind('click');
	$("#more_details").click(function(){widget.openURL('http://www.rememberthemilk.com/home/'+user_username+'/'+tasks[t].list_id+'/'+tasks[t].task.id);});
	$("#detailsDiv").css("display","block");
}

//close detail box
function closeDetails (){
	currentTask = null;
	if (detailsOpen){
		detailsOpen = false;
		$("#taskDetails").animate({width: "0px"},1000,closeDetails);
		$("#detailsDiv").css("display","none");
		return;
	}
	if (window.widget) window.resizeTo(280,380);
	$("#taskDetails").css("border-style","none");
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

//keypress listener for editing name
function nameKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			nameEdit();
			break;
	}
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
	else showDetails(lookUp(id));
}

//keypress listener for editing due date
function dateKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			dateEdit();
			break;
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
	}else{
		if (!hasSettings) getSettings();
		//get task list
		$("#authDiv").hide();
		$("#listDiv").show();
		if (lists.length == 0) getLists(displayTasks); //no list yet
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
			if (tasks[t].date>=today&&tasks[t].date<tmr){
				sdate = "Today"; //Today
				name = "<b>"+name+"</b>";
			}
			if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==1)
				sdate = tasks[t].date.format("ddd"); //Within a week, short day
			if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time==0)
				sdate = tasks[t].date.format("dddd"); //Within a week, long day
			if (tasks[t].task.has_due_time==1)
				sdate += " @ "+ tasks[t].date.format("h:MM TT");
			if (tasks[t].date<today)
				name = "<u><b>"+name+"</b></u>"; //overdue
			if (tasks[t].date.getTime()==2147483647000)
				sdate = ""; //no due date
			$("#taskList").append("<li><input type=\"checkbox\" onclick=\"rtmComplete("+t+")\"/><span class=\"taskname\" onclick=\"showDetails("+t+")\">"+name+"<span class=\"duedate\">"+sdate+"</span></span></li>");
		}

		if (undoStack.length > 0) $("#undo").show();
		else $("#undo").hide();

		gMyScrollArea.refresh();
		
		if (detailsOpen) showDetails(lookUp(id)); //show the new task detail
	});
}

//add a task to tasks array, also include list_id and date
function addTask (t,list_id) {
	var d = new Date();
	if (t.task.due=="") d.setTime(2147483647000); //no due date
	else d.setISO8601(t.task.due);
	t.date = d;
	t.list_id = list_id;
	for (l in lists)
		if (lists[l].id==t.list_id)
			t.list_name=lists[l].name;
	tasks.push(t);
}

//helper function to sort array of Dates
function sortTasks (t1, t2){
	return t1.date-t2.date;
}

//add a task when return or enter is pressed
function inputKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			rtmAdd(document.getElementById('taskinput').value,$("#taskinput_list").val());
			document.getElementById('taskinput').value = '';
			break;
	}
}

//done with filter, return to front
function filterKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			filterChange();
			showFront();
			break;
	}
}

//debug
function log (s){
	if (typeof(debug)!="undefined" && debug) alert(s);
}