import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h1>
            <p className="mt-2 text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Reload page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
