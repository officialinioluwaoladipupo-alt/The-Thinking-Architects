"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export default class FirestoreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: formatFirestoreErrorMessage(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FirestoreErrorBoundary caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-[640px] rounded-2xl border border-black/10 bg-[#efeeec] p-8 text-[#111111]">
          <div className="flex items-center gap-3 text-[#fe3619]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <span className="label-mono">Database Operation Notice</span>
          </div>
          <h2 className="mt-3 text-xl font-medium tracking-[-0.02em]">
            We hit a permissions or connectivity error.
          </h2>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-[#111111]/70">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="label-mono mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#111111] px-5 py-2.5 text-white transition-opacity hover:opacity-85"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Try again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
