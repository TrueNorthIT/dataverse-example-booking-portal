import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderWithProviders, screen, mockClient, setAuth0State, waitFor } from "../setup/test-utils"
import { ContactProvider, useContact } from "@/components/auth/ContactProvider"

function ContactDisplay() {
  const contact = useContact()
  return <div data-testid="contact">{contact ? contact.fullname : "no-contact"}</div>
}

describe("ContactProvider", () => {
  beforeEach(() => {
    setAuth0State({
      isAuthenticated: true,
      user: { sub: "auth0|x", name: "Sarah Johnson", email: "sarah@example.com" },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("renders children immediately while checking, then exposes the contact when whoami returns one", async () => {
    mockClient.me.whoami.mockResolvedValue({
      dataverseContact: {
        contactid: "c1",
        fullname: "Sarah Johnson",
        emailaddress1: "sarah@example.com",
      },
    })

    renderWithProviders(
      <ContactProvider>
        <ContactDisplay />
      </ContactProvider>
    )

    // children render immediately in "checking" (contact null)
    expect(screen.getByTestId("contact")).toBeInTheDocument()
    // after whoami resolves, ready -> contact present
    await waitFor(() =>
      expect(screen.getByTestId("contact")).toHaveTextContent("Sarah Johnson")
    )
  })

  it("shows the error screen when whoami rejects", async () => {
    mockClient.me.whoami.mockRejectedValue(new Error("network down"))

    renderWithProviders(
      <ContactProvider>
        <ContactDisplay />
      </ContactProvider>
    )

    expect(await screen.findByText("Account Error")).toBeInTheDocument()
    expect(screen.getByText("network down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Sign out and try again/ })).toBeInTheDocument()
  })

  it("creates a contact (creating screen) when whoami returns no contact, then becomes ready", async () => {
    vi.useFakeTimers()
    // First whoami: no contact. Second whoami (after create): a contact.
    mockClient.me.whoami
      .mockResolvedValueOnce({ dataverseContact: null })
      .mockResolvedValueOnce({
        dataverseContact: {
          contactid: "c2",
          fullname: "Sarah Johnson",
          emailaddress1: "sarah@example.com",
        },
      })
    mockClient.me.create.mockResolvedValueOnce({ data: {} })

    renderWithProviders(
      <ContactProvider>
        <ContactDisplay />
      </ContactProvider>
    )

    // Drain the first whoami microtask -> creating screen appears
    await vi.waitFor(() => {
      expect(screen.getByText("Setting up your account...")).toBeInTheDocument()
    })
    expect(screen.getByText("Creating your citizen record")).toBeInTheDocument()
    // Self-provisions via the authenticated /me/register endpoint (SDK create).
    expect(mockClient.me.create).toHaveBeenCalledWith(
      "register",
      expect.objectContaining({ firstname: expect.any(String) })
    )

    // Advance past the MIN_ANIM_MS delay and let promises settle -> ready
    await vi.advanceTimersByTimeAsync(3000)
    await vi.waitFor(() => {
      expect(screen.getByTestId("contact")).toHaveTextContent("Sarah Johnson")
    })
  })

  it("shows the error screen when contact registration fails", async () => {
    mockClient.me.whoami.mockResolvedValue({ dataverseContact: null })
    mockClient.me.create.mockRejectedValueOnce(new Error("Registration failed"))

    renderWithProviders(
      <ContactProvider>
        <ContactDisplay />
      </ContactProvider>
    )

    expect(await screen.findByText("Account Error")).toBeInTheDocument()
    expect(screen.getByText(/Registration failed/)).toBeInTheDocument()
  })

  it("does nothing when there is no user email", () => {
    setAuth0State({ isAuthenticated: false, user: undefined })
    renderWithProviders(
      <ContactProvider>
        <ContactDisplay />
      </ContactProvider>
    )
    // Stays in "checking" -> renders children with null contact
    expect(screen.getByTestId("contact")).toHaveTextContent("no-contact")
    expect(mockClient.me.whoami).not.toHaveBeenCalled()
  })
})
