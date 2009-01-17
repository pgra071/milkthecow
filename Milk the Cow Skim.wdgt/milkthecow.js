// Milk the Cow - Skim
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/
//
//This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

var version = "0.2.0";
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

var lists = []; //user lists for tasks

var hasSettings = false;
//user setting - http://www.rememberthemilk.com/services/api/methods/rtm.settings.getList.rtm
var timezone = "";    //The user's Olson timezone. Blank if the user has not set a timezone.
var dateformat = 1;   //0 indicates an European date format (e.g. 14/02/06), 1 indicates an American date format (e.g. 02/14/06).
var timeformat = 0;   //0 indicates 12 hour time with day period (e.g. 5pm), 1 indicates 24 hour time (e.g. 17:00).
var defaultlist = ""; //The user's default list. Blank if the user has not set a default list.
var language = "";    //The user's language (ISO 639-1 code).

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

	$("#me").text("Milk the Cow - Skim "+version);
	
  refresh();
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

	var json = eval("("+$.ajax({url: methurl,data: data}).responseText+")");
	return json;
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
	var res = rtmCall({method:"rtm.auth.getFrob"});
	//log("frob: "+res.rsp.frob);
	if(res.rsp.stat == "ok") return res.rsp.frob;
	return "fail"; //fail to get frob
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

//add a task with name, 'name', to list, 'list_id'
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
		if (tags.length<=0){
			refresh();
		}else{
			//Add tags to a task. tags should be a comma delimited list of tags.
			//This method requires authentication with write permissions.
			//This method requires a timeline.
			//The effects of this method can be undone.
			log("addTags: "+tags);
			rtmCallAsync({method:"rtm.tasks.addTags",list_id:res.list.id,taskseries_id:res.list.taskseries.id,task_id:res.list.taskseries.task.id,tags:tags},function(r,t){refresh();});
		}
	}
	
	if (list_id != "")
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1",list_id:list_id},callback);
	else
		rtmCallAsync({method:"rtm.tasks.add",name:name,parse:"1"},callback);
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

//add a task when return or enter is pressed
function inputKeyPress (event){
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			rtmAdd($("#taskinput").val(),$("#taskinput_list").val());
			$("#taskinput").val('');
			break;
	}
}

//get list of lists
function getLists (){
	rtmCallAsync({method:"rtm.lists.getList"},function(r,t){
		log(r);
		var res = eval("("+r+")").rsp;
		if (res.stat=="ok") {
			lists = res.lists.list;
			$("#taskinput_list").empty();
			for (var l in lists){
				$("#taskinput_list").append("<option value='"+lists[l].id+"'>"+lists[l].name+"</option>");
			}
			log(defaultlist);
			$("#taskinput_list").val(defaultlist);
		}
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

function refresh (){
  if (!checkToken()){
    //show auth link
		$("#authDiv").show();
		$("#taskinput").hide();
		if (window.widget) $("#authDiv").html("<span id=\"authurl\" onclick=\"widget.openURL('"+rtmAuthURL("delete")+"')\">Click Here</span> to authentication.");
		else $("#authDiv").html("<a id=\"authurl\" target=\"_blank\" href=\""+rtmAuthURL("delete")+"\">Click Here</a> to authentication.");
	}else{
		if (!hasSettings) getSettings();
		if (lists.length == 0) getLists(); //no list yet
		$("#authDiv").hide();
		$("#taskinput").show();
	}
}

//debug
function log (s){
	if (typeof(debug)!="undefined" && debug) alert(s);
}