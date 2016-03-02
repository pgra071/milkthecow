# Error Codes #
This is only to provide developers with a quick reference.

## Basic ##
1: Method not found
> The requested method was not found.
96: Invalid signature
> The passed signature was invalid.
97: Missing signature
> The call required signing but no signature was sent.
98: Login failed / Invalid auth token
> The login details or auth token passed were invalid.
99: User not logged in / Insufficient permissions
> The method requires user authentication but the user was not logged in, or the authenticated method call did not have the required permissions.
100: Invalid API Key
> The API key passed was not valid or has expired.
101: Invalid frob - did you authenticate?
> The frob passed was not valid or has expired.
105: Service currently unavailable
> The requested service is temporarily unavailable.
111: Format "xxx" not found
> The requested response format was not found.
112: Method "xxx" not found
> The requested method was not found.
114: Invalid SOAP envelope
> The SOAP envelope sent in the request could not be parsed.
115: Invalid XML-RPC Method Call
> The XML-RPC request document could not be parsed.

## RTM IDs ##
300: Timeline invalid or not provided
> No timeline provided / Timeline invalid.
310: transaction\_id invalid or not provided
> No transaction\_id provided / transaction\_id invalid.
320: list\_id invalid or not provided
> No list\_id provided / list\_id invalid.
340: task\_id invalid or not provided
> No task\_id provided / task\_id invalid.
350: note\_id invalid or not provided
> No note\_id provided / note\_id invalid.
360: contact\_id invalid or not provided
> No contact\_id provided / contact\_id invalid.
370: group\_id invalid or not provided
> No group\_id provided / group\_id invalid.
380: location\_id invalid or not provided
> No location\_id provided / location\_id invalid.

## Contact ##
1000: Contact provided is invalid.
> The contact provided is invalid.
1010: Contact provided already exists.
> The contact provided is already listed as a contact for this user.
1020: Contact requested does not exist.
> The contact requested does not exist.
1030: Cannot add yourself as a contact.
> You cannot add yourself as a contact.

## Group ##
2000: Group name provided is invalid.
> The group name provided is invalid.
2010: Group provided already exists.
> User already has a group with this name.

## List ##
3000: List name provided is invalid.
> The list name provided is invalid.
3010: List provided is locked.
> The list provided is locked and cannot be modified.

## Task ##
4000: Task name provided is invalid.
> The task name provided is invalid.
4010: Cannot move task.
> Cannot move task to a list it is already in.