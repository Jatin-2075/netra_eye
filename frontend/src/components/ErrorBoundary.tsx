import { Component, type ErrorInfo, type ReactNode } from "react";

interface State { failed: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Netra Voice crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fatal" role="alert">
        <div className="fatal-card">
          <h1>Something went wrong</h1>
          <p>Netra Voice hit an unexpected problem. Reloading usually fixes it.</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
