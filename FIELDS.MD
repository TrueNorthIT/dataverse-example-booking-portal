── bookableresource fields ───────────────────────
accountid (Lookup) — "Account"
accountidname (String)
accountidyominame (String)
bookableresourceid (Uniqueidentifier) — "Bookable Resource"
calendarid (Lookup) — "Calendar"
calendaridname (String)
contactid (Lookup) — "Contact"
contactidname (String)
contactidyominame (String)
createdby (Lookup) — "Created By"
createdbyname (String)
createdbyyominame (String)
createdon (DateTime) — "Created On"
createdonbehalfby (Lookup) — "Created By (Delegate)"
createdonbehalfbyname (String)
createdonbehalfbyyominame (String)
exchangerate (Decimal) — "ExchangeRate"
importsequencenumber (Integer) — "Import Sequence Number"
modifiedby (Lookup) — "Modified By"
modifiedbyname (String)
modifiedbyyominame (String)
modifiedon (DateTime) — "Modified On"
modifiedonbehalfby (Lookup) — "Modified By (Delegate)"
modifiedonbehalfbyname (String)
modifiedonbehalfbyyominame (String)
msdyn_bookingstodrip (Integer) — "(deprecated) Bookings To Drip"
msdyn_crewstrategy (Picklist) — "Crew Strategy"
msdyn_crewstrategyname (Virtual)
msdyn_derivecapacity (Boolean) — "Derive Capacity From Group Members"
msdyn_derivecapacityname (Virtual)
msdyn_displayonscheduleassistant (Boolean) — "Enable for Availability Search"
msdyn_displayonscheduleassistantname (Virtual)
msdyn_displayonscheduleboard (Boolean) — "Display On Schedule Board"
msdyn_displayonscheduleboardname (Virtual)
msdyn_enableappointments (Picklist) — "Include Appointments"
msdyn_enableappointmentsname (Virtual)
msdyn_enabledforfieldservicemobile (Boolean) — "Enable for Field Service Mobile (legacy Xamarin app)"
msdyn_enabledforfieldservicemobilename (Virtual)
msdyn_enabledripscheduling (Boolean) — "Enable Drip Scheduling"
msdyn_enabledripschedulingname (Virtual)
msdyn_enableoutlookschedules (Picklist) — "Include Outlook Free/Busy in Search Resource Availability API"
msdyn_enableoutlookschedulesname (Virtual)
msdyn_endlocation (Picklist) — "End Location"
msdyn_endlocationname (Virtual)
msdyn_generictype (Picklist) — "Generic Type (Deprecated)"
msdyn_generictypename (Virtual)
msdyn_hourlyrate (Money) — "Hourly Rate"
msdyn_hourlyrate_base (Money) — "Hourly Rate (Base)"
msdyn_internalflags (Memo) — "Internal Flags"
msdyn_latitude (Double) — "Latitude"
msdyn_locationtimestamp (DateTime) — "Location Timestamp"
msdyn_longitude (Double) — "Longitude"
msdyn_optimalcrewsize (Integer) — "Optimal Crew Size"
msdyn_organizationalunit (Lookup) — "Organizational Unit"
msdyn_organizationalunitname (String)
msdyn_pooltype (Virtual) — "Pool Type"
msdyn_pooltypename (Virtual)
msdyn_primaryemail (String) — "Primary Email"
msdyn_startlocation (Picklist) — "Start Location"
msdyn_startlocationname (Virtual)
msdyn_targetutilization (Integer) — "Target Utilization"
msdyn_timeoffapprovalrequired (Boolean) — "Time Off Approval Required"
msdyn_timeoffapprovalrequiredname (Virtual)
msdyn_warehouse (Lookup) — "Warehouse"
msdyn_warehousename (String)
name (String) — "Name"
overriddencreatedon (DateTime) — "Record Created On"
ownerid (Owner) — "Owner"
owneridname (String)
owneridtype (EntityName)
owneridyominame (String)
owningbusinessunit (Lookup) — "Owning Business Unit"
owningbusinessunitname (String)
owningteam (Lookup) — "Owning Team"
owninguser (Lookup) — "Owning User"
processid (Uniqueidentifier) — "Process Id"
resourcetype (Picklist) — "Resource Type"
resourcetypename (Virtual)
stageid (Uniqueidentifier) — "(Deprecated) Stage Id"
statecode (State) — "Status"
statecodename (Virtual)
statuscode (Status) — "Status Reason"
statuscodename (Virtual)
timezone (Integer) — "Time Zone"
timezoneruleversionnumber (Integer) — "Time Zone Rule Version Number"
transactioncurrencyid (Lookup) — "Currency"
transactioncurrencyidname (String)
traversedpath (String) — "(Deprecated) Traversed Path"
userid (Lookup) — "User"
useridname (String)
useridyominame (String)
utcconversiontimezonecode (Integer) — "UTC Conversion Time Zone Code"
versionnumber (BigInt) — "Version Number"
Total: 93 fields
── bookableresourcebooking fields ─────────────────
bookableresourcebookingid (Uniqueidentifier) — "Bookable Resource Booking"
bookingstatus (Lookup) — "Booking Status"
bookingstatusname (String)
bookingtype (Picklist) — "Booking Type"
bookingtypename (Virtual)
createdby (Lookup) — "Created By"
createdbyname (String)
createdbyyominame (String)
createdon (DateTime) — "Created On"
createdonbehalfby (Lookup) — "Created By (Delegate)"
createdonbehalfbyname (String)
createdonbehalfbyyominame (String)
duration (Integer) — "Duration"
endtime (DateTime) — "End Time"
exchangerate (Decimal) — "ExchangeRate"
header (Lookup) — "Header"
headername (String)
importsequencenumber (Integer) — "Import Sequence Number"
modifiedby (Lookup) — "Modified By"
modifiedbyname (String)
modifiedbyyominame (String)
modifiedon (DateTime) — "Modified On"
modifiedonbehalfby (Lookup) — "Modified By (Delegate)"
modifiedonbehalfbyname (String)
modifiedonbehalfbyyominame (String)
msdyn_acceptcascadecrewchanges (Boolean) — "Accept Cascade Crew Changes"
msdyn_acceptcascadecrewchangesname (Virtual)
msdyn_actualarrivaltime (DateTime) — "Actual Arrival Time"
msdyn_actualtravelduration (Integer) — "Actual Travel Duration"
msdyn_agreementbookingdate (Lookup) — "Agreement Booking Date"
msdyn_agreementbookingdatename (String)
msdyn_allowoverlapping (Boolean) — "Allow Overlapping"
msdyn_allowoverlappingname (Virtual)
msdyn_appointmentbookingid (Lookup) — "Appointment Booking"
msdyn_appointmentbookingidname (String)
msdyn_basetravelduration (Integer) — "Base Travel Duration"
msdyn_bookingmethod (Picklist) — "Booking Method"
msdyn_bookingmethodname (Virtual)
msdyn_bookingsetupmetadataid (Lookup) — "Booking Setup Metadata"
msdyn_bookingsetupmetadataidname (String)
msdyn_cascadecrewchanges (Boolean) — "Cascade Crew Changes"
msdyn_cascadecrewchangesname (Virtual)
msdyn_crew (Lookup) — "Crew"
msdyn_crewmembertype (Picklist) — "Crew Member Type"
msdyn_crewmembertypename (Virtual)
msdyn_crewname (String)
msdyn_effort (Decimal) — "Capacity"
msdyn_estimatedarrivaltime (DateTime) — "Estimated Arrival Time"
msdyn_estimatedtravelduration (Integer) — "Estimated Travel Duration"
msdyn_globalobjectid (String) — "GlobalObjectId"
msdyn_internalflags (Memo) — "Internal Flags"
msdyn_latitude (Double) — "Latitude"
msdyn_longitude (Double) — "Longitude"
msdyn_milestraveled (Double) — "Miles Traveled"
msdyn_offlinetimestamp (DateTime) — "Offline Timestamp"
msdyn_preventtimestampcreation (Boolean) — "Prevent Timestamp Creation"
msdyn_preventtimestampcreationname (Virtual)
msdyn_quickNoteAction (Picklist) — "Quick note actions"
msdyn_quicknoteactionname (Virtual)
msdyn_requirementgroupid (Lookup) — "Requirement Group"
msdyn_requirementgroupidname (String)
msdyn_requirementgroupset (String) — "Requirement Group Set"
msdyn_resourcegroup (Lookup) — "Resource Group"
msdyn_resourcegroupname (String)
msdyn_resourcerequirement (Lookup) — "Resource Requirement"
msdyn_resourcerequirementname (String)
msdyn_signature (Memo) — "Signature"
msdyn_slottext (Memo) — "Slot Text"
msdyn_timegroupdetailselected (Lookup) — "Time Group Detail Selected"
msdyn_timegroupdetailselectedname (String)
msdyn_totalbillableduration (Integer) — "Total Billable Duration"
msdyn_totalbreakduration (Integer) — "Total Break Duration"
msdyn_totalcost (Money) — "Total Cost"
msdyn_totalcost_base (Money) — "Total Cost (Base)"
msdyn_totaldurationinprogress (Integer) — "Total Duration In Progress"
msdyn_traveltimecalculationtype (Picklist) — "Travel Time Calculation"
msdyn_traveltimecalculationtypename (Virtual)
msdyn_traveltimerescheduling (Boolean) — "Travel Time Rescheduling (Deprecated)"
msdyn_traveltimereschedulingname (Virtual)
msdyn_tzaendtime (DateTime) — "End Date Time Zone Independent"
msdyn_tzastarttime (DateTime) — "Start Date Time Zone Independent"
msdyn_ursinternalflags (Memo) — "Internal Flags"
msdyn_worklocation (Picklist) — "Work Location"
msdyn_worklocationname (Virtual)
msdyn_workorder (Lookup) — "Work Order"
msdyn_workordername (String)
name (String) — "Name"
overriddencreatedon (DateTime) — "Record Created On"
ownerid (Owner) — "Owner"
owneridname (String)
owneridtype (EntityName)
owneridyominame (String)
owningbusinessunit (Lookup) — "Owning Business Unit"
owningbusinessunitname (String)
owningteam (Lookup) — "Owning Team"
owninguser (Lookup) — "Owning User"
processid (Uniqueidentifier) — "Process Id"
resource (Lookup) — "Resource"
resourcename (String)
stageid (Uniqueidentifier) — "(Deprecated) Stage Id"
starttime (DateTime) — "Start Time"
statecode (State) — "Status"
statecodename (Virtual)
statuscode (Status) — "Status Reason"
statuscodename (Virtual)
timezoneruleversionnumber (Integer) — "Time Zone Rule Version Number"
tn_contact (Lookup) — "Citizen Contact" [custom: navProp="tn_Contact" → contact]
transactioncurrencyid (Lookup) — "Currency"
transactioncurrencyidname (String)
traversedpath (String) — "(Deprecated) Traversed Path"
utcconversiontimezonecode (Integer) — "UTC Conversion Time Zone Code"
versionnumber (BigInt) — "Version Number"
Total: 112 fields
── tn_citizenservicebooking fields ────────────────
createdby (Lookup) — "Created By"
createdbyname (String)
createdbyyominame (String)
createdon (DateTime) — "Created On"
createdonbehalfby (Lookup) — "Created By (Delegate)"
createdonbehalfbyname (String)
createdonbehalfbyyominame (String)
importsequencenumber (Integer) — "Import Sequence Number"
modifiedby (Lookup) — "Modified By"
modifiedbyname (String)
modifiedbyyominame (String)
modifiedon (DateTime) — "Modified On"
modifiedonbehalfby (Lookup) — "Modified By (Delegate)"
modifiedonbehalfbyname (String)
modifiedonbehalfbyyominame (String)
overriddencreatedon (DateTime) — "Record Created On"
ownerid (Owner) — "Owner"
owneridname (String)
owneridtype (EntityName)
owneridyominame (String)
owningbusinessunit (Lookup) — "Owning Business Unit"
owningbusinessunitname (String)
owningteam (Lookup) — "Owning Team"
owninguser (Lookup) — "Owning User"
statecode (State) — "Status"
statecodename (Virtual)
statuscode (Status) — "Status Reason"
statuscodename (Virtual)
timezoneruleversionnumber (Integer) — "Time Zone Rule Version Number"
tn_booking (Lookup) — "Booking" [custom: navProp="tn_Booking" → bookableresourcebooking]
tn_citizen (Lookup) — "Citizen" [custom: navProp="tn_Citizen" → contact]
tn_citizenservicebookingid (Uniqueidentifier) — "Citizen Service Booking"
tn_duration (Integer) — "Duration (minutes)"
tn_name (String) — "Name"
tn_notes (Memo) — "Notes"
tn_requestedend (DateTime) — "Requested End"
tn_requestedstart (DateTime) — "Requested Start"
tn_servicetype (Picklist) — "Service Type"
tn_servicetypename (Virtual)
tn_status (Picklist) — "Status"
tn_statusname (Virtual)
utcconversiontimezonecode (Integer) — "UTC Conversion Time Zone Code"
versionnumber (BigInt) — "Version Number"
Total: 41 fields
── tn_citizenservicebooking relationships ─────────
tn_citizen_csb: navProp="tn_Citizen" → contact
tn_booking_csb: navProp="tn_Booking" → bookableresourcebooking
lk_tn_citizenservicebooking_createdby: navProp="createdby" → systemuser
lk_tn_citizenservicebooking_createdonbehalfby: navProp="createdonbehalfby" → systemuser
lk_tn_citizenservicebooking_modifiedby: navProp="modifiedby" → systemuser
lk_tn_citizenservicebooking_modifiedonbehalfby: navProp="modifiedonbehalfby" → systemuser
user_tn_citizenservicebooking: navProp="owninguser" → systemuser
team_tn_citizenservicebooking: navProp="owningteam" → team
owner_tn_citizenservicebooking: navProp="ownerid" → owner
business_unit_tn_citizenservicebooking: navProp="owningbusinessunit" → businessunit
Total: 9 relationships
NOTE: The navProp value is the bind key (e.g. navProp@odata.bind)