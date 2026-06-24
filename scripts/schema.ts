/**
 * npm run schema
 *
 * Creates publisher, solution, CSB entity, columns, relationships,
 * buffer/slot columns on category. Idempotent — safe to re-run.
 */

import { dv } from "./helpers/client"
import { logSuccess, logError, logSkip, logHeading, logWarn } from "./helpers/log"

async function runSchema() {
  logHeading("── Publisher & Solution ──────────────────────────")

  // Publisher
  const existingPubs = await dv.getList<{
    publisherid: string
    customizationprefix: string
  }>("publishers?$filter=customizationprefix eq 'tn'&$select=publisherid,customizationprefix")

  let publisherId: string
  if (existingPubs.value.length > 0) {
    publisherId = existingPubs.value[0].publisherid
    logSkip(`  Publisher 'tn' (exists: ${publisherId})`)
  } else {
    const pub = await dv.postAndReturn<{ publisherid: string }>(
      "publishers",
      {
        friendlyname: "TrueNorth",
        uniquename: "tn",
        customizationprefix: "tn",
        customizationoptionvalueprefix: 88800,
      }
    )
    publisherId = pub.publisherid
    logSuccess(`  Publisher 'tn' (created: ${publisherId})`)
  }

  // Solution
  const existingSols = await dv.getList<{
    solutionid: string
    uniquename: string
  }>("solutions?$filter=uniquename eq 'CitizenBookings'&$select=solutionid,uniquename")

  if (existingSols.value.length > 0) {
    logSkip(`  Solution 'CitizenBookings' (exists)`)
  } else {
    await dv.post("solutions", {
      friendlyname: "Citizen Bookings",
      uniquename: "CitizenBookings",
      version: "1.0.0.0",
      "publisherid@odata.bind": `/publishers(${publisherId})`,
    })
    logSuccess(`  Solution 'CitizenBookings' (created)`)
  }

  // Remove legacy tn_Contact on bookableresourcebooking
  logHeading("── Remove Legacy tn_Contact on Booking ───────────")
  try {
    await dv.del("RelationshipDefinitions(SchemaName='tn_contact_bookableresourcebooking')")
    logSuccess(`  tn_Contact on booking (deleted)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("Could not find") || msg.includes("could not be found") || msg.includes("does not exist") || msg.includes("0x80048d06")) {
      logSkip(`  tn_Contact on booking (not present)`)
    } else {
      logWarn(`  tn_Contact removal failed: ${msg}`)
    }
  }

  // ── Citizen Service Booking entity ──────────────────────────────
  logHeading("── Citizen Service Booking Entity ────────────────")

  try {
    await dv.post("EntityDefinitions", {
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
      SchemaName: "tn_citizenservicebooking",
      DisplayName: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Citizen Service Booking", LanguageCode: 1033 }],
      },
      DisplayCollectionName: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Citizen Service Bookings", LanguageCode: 1033 }],
      },
      Description: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Citizen-facing booking that wraps a bookableresourcebooking", LanguageCode: 1033 }],
      },
      HasNotes: false,
      HasActivities: false,
      OwnershipType: "UserOwned",
      IsActivity: false,
      PrimaryNameAttribute: "tn_name",
      Attributes: [
        {
          "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
          SchemaName: "tn_name",
          MaxLength: 200,
          FormatName: { Value: "Text" },
          DisplayName: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Name", LanguageCode: 1033 }],
          },
          IsPrimaryName: true,
          RequiredLevel: { Value: "ApplicationRequired", CanBeChanged: true },
        },
      ],
    })
    logSuccess(`  Entity tn_citizenservicebooking (created)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("already exists") || msg.includes("not unique") || msg.includes("DuplicateEntity")) {
      logSkip(`  Entity tn_citizenservicebooking (exists)`)
    } else {
      throw err
    }
  }

  // CSB Columns
  logHeading("── CSB Columns ──────────────────────────────────")
  const csbColumns: { schema: string; payload: Record<string, unknown> }[] = [
    {
      schema: "tn_requestedstart",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        SchemaName: "tn_requestedstart",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Requested Start", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        Format: "DateAndTime",
        DateTimeBehavior: { Value: "UserLocal" },
      },
    },
    {
      schema: "tn_requestedend",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        SchemaName: "tn_requestedend",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Requested End", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        Format: "DateAndTime",
        DateTimeBehavior: { Value: "UserLocal" },
      },
    },
    {
      schema: "tn_duration",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        SchemaName: "tn_duration",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Duration (minutes)", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        MinValue: 0,
        MaxValue: 1440,
        Format: "Duration",
      },
    },
    {
      schema: "tn_notes",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        SchemaName: "tn_notes",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Notes", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        MaxLength: 2000,
        Format: "Text",
      },
    },
    {
      schema: "tn_servicetype",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        SchemaName: "tn_servicetype",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Service Type", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
          IsGlobal: false,
          OptionSetType: "Picklist",
          Options: [
            { Value: 888000000, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Leisure", LanguageCode: 1033 }] } },
            { Value: 888000001, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Recycling", LanguageCode: 1033 }] } },
            { Value: 888000002, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Sports", LanguageCode: 1033 }] } },
            { Value: 888000003, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Community", LanguageCode: 1033 }] } },
            { Value: 888000004, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Library", LanguageCode: 1033 }] } },
            { Value: 888000005, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Registration", LanguageCode: 1033 }] } },
            { Value: 888000006, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Venue Hire", LanguageCode: 1033 }] } },
          ],
        },
      },
    },
    {
      schema: "tn_status",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        SchemaName: "tn_status",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Status", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
          IsGlobal: false,
          OptionSetType: "Picklist",
          Options: [
            { Value: 888000000, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Requested", LanguageCode: 1033 }] } },
            { Value: 888000001, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Confirmed", LanguageCode: 1033 }] } },
            { Value: 888000002, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "In Progress", LanguageCode: 1033 }] } },
            { Value: 888000003, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Completed", LanguageCode: 1033 }] } },
            { Value: 888000004, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Cancelled", LanguageCode: 1033 }] } },
          ],
        },
      },
    },
    {
      schema: "tn_amountpaid",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
        SchemaName: "tn_amountpaid",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Amount Paid (£)", LanguageCode: 1033 }] },
        Description: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Total paid by the citizen for this booking", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        MinValue: 0,
        MaxValue: 1000000,
        Precision: 2,
      },
    },
    {
      schema: "tn_sellingtickets",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        SchemaName: "tn_sellingtickets",
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Selling Tickets", LanguageCode: 1033 }] },
        Description: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Whether the citizen is selling tickets (affects venue hire rate)", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        DefaultValue: false,
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
          TrueOption: { Value: 1, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Yes", LanguageCode: 1033 }] } },
          FalseOption: { Value: 0, Label: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "No", LanguageCode: 1033 }] } },
        },
      },
    },
    {
      schema: "tn_paymentreference",
      payload: {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: "tn_paymentreference",
        MaxLength: 100,
        FormatName: { Value: "Text" },
        DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Payment Reference", LanguageCode: 1033 }] },
        Description: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Stripe PaymentIntent id (pi_...)", LanguageCode: 1033 }] },
        RequiredLevel: { Value: "None", CanBeChanged: true },
      },
    },
  ]

  for (const col of csbColumns) {
    try {
      await dv.post(
        "EntityDefinitions(LogicalName='tn_citizenservicebooking')/Attributes",
        col.payload
      )
      logSuccess(`  ${col.schema} (created)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("already exists") || msg.includes("not unique")) {
        logSkip(`  ${col.schema} (exists)`)
      } else {
        throw err
      }
    }
  }

  // CSB Lookups
  logHeading("── CSB Lookups ──────────────────────────────────")
  const oldRelationships = ["tn_contact_csb", "tn_booking_citizenservicebooking"]
  for (const rel of oldRelationships) {
    try {
      await dv.del(`RelationshipDefinitions(SchemaName='${rel}')`)
      logSuccess(`  ${rel} (deleted old)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("Could not find") || msg.includes("could not be found") || msg.includes("does not exist") || msg.includes("0x80048d06")) {
        logSkip(`  ${rel} (not present)`)
      } else {
        logWarn(`  ${rel} delete failed: ${msg}`)
      }
    }
  }

  const csbLookups = [
    { schema: "tn_citizen_csb", lookupSchema: "tn_Citizen", navProp: "tn_Citizen", label: "Citizen", referenced: "contact" },
    { schema: "tn_booking_csb", lookupSchema: "tn_Booking", navProp: "tn_Booking", label: "Booking", referenced: "bookableresourcebooking" },
  ]

  for (const lk of csbLookups) {
    try {
      await dv.post("RelationshipDefinitions", {
        "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
        SchemaName: lk.schema,
        ReferencedEntity: lk.referenced,
        ReferencingEntity: "tn_citizenservicebooking",
        ReferencingEntityNavigationPropertyName: lk.navProp,
        CascadeConfiguration: {
          Assign: "NoCascade",
          Delete: "RemoveLink",
          Merge: "NoCascade",
          Reparent: "NoCascade",
          Share: "NoCascade",
          Unshare: "NoCascade",
          RollupView: "NoCascade",
        },
        Lookup: {
          "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
          SchemaName: lk.lookupSchema,
          DisplayName: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: lk.label, LanguageCode: 1033 }],
          },
          RequiredLevel: { Value: "None", CanBeChanged: true },
        },
      })
      logSuccess(`  ${lk.navProp} -> ${lk.referenced} (created)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("not unique") || msg.includes("already exists")) {
        logSkip(`  ${lk.navProp} -> ${lk.referenced} (exists)`)
      } else {
        throw err
      }
    }
  }

  // Ensure Venue Hire option exists on tn_servicetype (existing envs skip the
  // attribute create above, so add the new option explicitly — idempotent)
  logHeading("── Venue Hire Service Type Option ────────────────")
  try {
    await dv.post("InsertOptionValue", {
      EntityLogicalName: "tn_citizenservicebooking",
      AttributeLogicalName: "tn_servicetype",
      Value: 888000006,
      Label: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Venue Hire", LanguageCode: 1033 }],
      },
    })
    logSuccess(`  tn_servicetype: Venue Hire (added)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("already exists") || msg.includes("not unique") || msg.includes("duplicate") || msg.includes("0x")) {
      logSkip(`  tn_servicetype: Venue Hire (exists)`)
    } else {
      throw err
    }
  }

  // Hourly rate columns on bookableresource (venue hire pricing)
  logHeading("── Hourly Rate Columns on Resource ───────────────")
  const rateColumns: { schema: string; label: string; desc: string }[] = [
    { schema: "tn_hourlyrate", label: "Hourly Rate (£)", desc: "Standard hire rate per hour (not selling tickets)" },
    { schema: "tn_hourlyrateticketed", label: "Hourly Rate — Ticketed (£)", desc: "Hire rate per hour when selling tickets" },
  ]
  for (const col of rateColumns) {
    try {
      await dv.post(
        "EntityDefinitions(LogicalName='bookableresource')/Attributes",
        {
          "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
          SchemaName: col.schema,
          DisplayName: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: col.label, LanguageCode: 1033 }] },
          Description: { "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: col.desc, LanguageCode: 1033 }] },
          RequiredLevel: { Value: "None", CanBeChanged: true },
          MinValue: 0,
          MaxValue: 100000,
          Precision: 2,
        }
      )
      logSuccess(`  ${col.schema} (created)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("already exists") || msg.includes("not unique")) {
        logSkip(`  ${col.schema} (exists)`)
      } else {
        throw err
      }
    }
  }

  // Buffer minutes column on bookableresourcecategory
  logHeading("── Buffer Column on Category ─────────────────────")
  try {
    await dv.post(
      "EntityDefinitions(LogicalName='bookableresourcecategory')/Attributes",
      {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        SchemaName: "tn_bufferminutes",
        DisplayName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Buffer (minutes)", LanguageCode: 1033 }],
        },
        Description: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Dead time after each booking for changeover", LanguageCode: 1033 }],
        },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        MinValue: 0,
        MaxValue: 120,
        Format: "None",
      }
    )
    logSuccess(`  tn_bufferminutes (created)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("already exists") || msg.includes("not unique")) {
      logSkip(`  tn_bufferminutes (exists)`)
    } else {
      throw err
    }
  }

  // Slot duration column on bookableresourcecategory
  logHeading("── Slot Duration Column on Category ─────────────")
  try {
    await dv.post(
      "EntityDefinitions(LogicalName='bookableresourcecategory')/Attributes",
      {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        SchemaName: "tn_slotdurationmins",
        DisplayName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Slot Duration (minutes)", LanguageCode: 1033 }],
        },
        Description: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Duration of each booking slot for this service category", LanguageCode: 1033 }],
        },
        RequiredLevel: { Value: "None", CanBeChanged: true },
        MinValue: 15,
        MaxValue: 480,
        Format: "None",
      }
    )
    logSuccess(`  tn_slotdurationmins (created)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("already exists") || msg.includes("not unique")) {
      logSkip(`  tn_slotdurationmins (exists)`)
    } else {
      throw err
    }
  }

  // Search aliases column on bookableresourcecategory
  logHeading("── Search Aliases Column on Category ─────────────")
  try {
    await dv.post(
      "EntityDefinitions(LogicalName='bookableresourcecategory')/Attributes",
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        SchemaName: "tn_searchaliases",
        MaxLength: 1000,
        FormatName: { Value: "Text" },
        DisplayName: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Search Aliases", LanguageCode: 1033 }],
        },
        Description: {
          "@odata.type": "Microsoft.Dynamics.CRM.Label",
          LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: "Comma-separated keywords citizens might search for (e.g. skip,tip,dump)", LanguageCode: 1033 }],
        },
        RequiredLevel: { Value: "None", CanBeChanged: true },
      }
    )
    logSuccess(`  tn_searchaliases (created)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("already exists") || msg.includes("not unique")) {
      logSkip(`  tn_searchaliases (exists)`)
    } else {
      throw err
    }
  }

  // Remove legacy tn_Capacity column
  logHeading("── Removing Legacy Columns ───────────────────────")
  try {
    await dv.del(
      "EntityDefinitions(LogicalName='bookableresource')/Attributes(LogicalName='tn_capacity')"
    )
    logSuccess(`  tn_Capacity on resource (deleted)`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("Could not find") || msg.includes("could not be found") || msg.includes("does not exist") || msg.includes("0x80048d06")) {
      logSkip(`  tn_Capacity on resource (not present)`)
    } else {
      logWarn(`  tn_Capacity removal failed: ${msg}`)
      logWarn(`  You may need to remove it from forms/views first`)
    }
  }

  // Add all customised OOB entities + tn_ columns to solution
  // This ensures the Web API CSDL metadata picks up our custom columns
  logHeading("── Solution Components ───────────────────────────")

  const oobEntities = [
    "bookableresourcecategory",
    "bookableresource",
    "bookableresourcebooking",
    "bookableresourcecategoryassn",
    "contact",
    "bookingstatus",
  ]

  for (const entityName of oobEntities) {
    const meta = await dv.get<{ MetadataId: string }>(
      `EntityDefinitions(LogicalName='${entityName}')?$select=MetadataId`
    )

    // Add entity to solution
    try {
      await dv.post("AddSolutionComponent", {
        ComponentId: meta.MetadataId,
        ComponentType: 1,
        SolutionUniqueName: "CitizenBookings",
        AddRequiredComponents: false,
        DoNotIncludeSubcomponents: true,
      })
      logSuccess(`  ${entityName} added`)
    } catch {
      logSkip(`  ${entityName} (already in solution)`)
    }

    // Add any tn_ custom columns
    const allAttrs = await dv.getList<{ MetadataId: string; LogicalName: string }>(
      `EntityDefinitions(${meta.MetadataId})/Attributes?$select=MetadataId,LogicalName`
    )
    const tnAttrs = allAttrs.value.filter((a) => a.LogicalName.startsWith("tn_"))
    for (const attr of tnAttrs) {
      try {
        await dv.post("AddSolutionComponent", {
          ComponentId: attr.MetadataId,
          ComponentType: 2,
          SolutionUniqueName: "CitizenBookings",
          AddRequiredComponents: false,
        })
        logSuccess(`    ${attr.LogicalName} added`)
      } catch {
        logSkip(`    ${attr.LogicalName} (already in solution)`)
      }
    }
  }

  // Publish
  logHeading("── Publishing ────────────────────────────────────")
  logSkip("  Publishing customizations...")
  await dv.post("PublishAllXml", {})
  logSuccess("  Published!")

  logHeading("══════════════════════════════════════════════════")
  logSuccess("  Schema update complete!")
}

runSchema().catch((err) => {
  logError(`Schema update failed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
