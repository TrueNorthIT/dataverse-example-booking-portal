export const queryKeys = {
  categories: ["categories"] as const,
  category: (id?: string) => ["category", id] as const,
  rooms: (id?: string) => ["room", id] as const,
  roomsByCategory: (id?: string) => ["roomsByCategory", id] as const,
  availability: (resourceId?: string, date?: string) =>
    ["availability", resourceId, date] as const,
  myBookings: ["myBookings"] as const,
  bookingStatuses: ["bookingStatuses"] as const,
  busyness: (date: string) => ["todaysBusyness", date] as const,
  resourceCategoryMap: ["resourceCategoryMap"] as const,
  categoryResourceNames: ["categoryResourceNames"] as const,
  calendarCapacity: (calendarId?: string, date?: string) =>
    ["calendarCapacity", calendarId, date] as const,
  venueDayBookings: (resourceId?: string, date?: string | null) =>
    ["venueDayBookings", resourceId, date] as const,
}
